import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../client";
import { isRateLimited } from "../rate-limit";
import { orderSchema } from "../../zod-schemas";

// POST: Place a guest or authenticated customer order
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    
    // Rate limit for placing orders: max 5 requests per minute (anti-spam)
    const limitResult = isRateLimited(ip, { limit: 5, interval: 60000 });
    if (limitResult.limited) {
      return NextResponse.json(
        { error: "Too many orders placed from this address. Please wait a minute.", code: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    // 1. Validate payload with Zod
    const validation = orderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          code: "VALIDATION_ERROR", 
          details: validation.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const orderData = validation.data;
    const supabase = await createClient();

    // 2. Perform Transactional Checks (Stock Availability)
    // We fetch current stock for all items in the order
    const productIds = orderData.items.map((item) => item.product_id);
    
    const { data: dbProducts, error: fetchError } = await supabase
      .from("products")
      .select("id, name, name_en, price, stock")
      .in("id", productIds);

    if (fetchError || !dbProducts) {
      return NextResponse.json(
        { error: "Could not retrieve products for validation", code: "PRODUCTS_NOT_FOUND" },
        { status: 400 }
      );
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Check availability & recalculate order amount securely server-side to prevent client tamper
    let computedTotal = 0;
    
    for (const item of orderData.items) {
      const dbProduct = productMap.get(item.product_id);
      
      if (!dbProduct) {
        return NextResponse.json(
          { error: `Product with ID ${item.product_id} no longer exists.`, code: "PRODUCT_MISSING" },
          { status: 400 }
        );
      }

      if (dbProduct.stock < item.quantity) {
        return NextResponse.json(
          { 
            error: `Insufficient stock for ${dbProduct.name_en}. Only ${dbProduct.stock} left in stock.`, 
            code: "INSUFFICIENT_STOCK",
            productId: item.product_id,
            availableStock: dbProduct.stock
          },
          { status: 400 }
        );
      }

      // Secure price calculations
      computedTotal += Number(dbProduct.price) * item.quantity;
    }

    // Add shipping fee (can load from settings in database)
    const { data: shippingSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "shipping")
      .single();

    let shippingFee = 25.00; // Default
    let freeAbove = 350.00;   // Default

    if (shippingSetting) {
      const val = shippingSetting.value as any;
      if (val.fee !== undefined) shippingFee = Number(val.fee);
      if (val.free_above !== undefined) freeAbove = Number(val.free_above);
    }

    const finalShippingFee = computedTotal >= freeAbove ? 0 : shippingFee;
    const totalWithShipping = computedTotal + finalShippingFee;

    // 3. Insert the order
    // Generate order ID (e.g. OW-YYYYMMDD-XXXX)
    const orderId = `OW-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: insertedOrder, error: orderInsertError } = await supabase
      .from("orders")
      .insert([
        {
          id: orderId,
          customer_name: orderData.customer_name,
          email: orderData.email,
          phone: orderData.phone,
          address: orderData.address,
          city: orderData.city,
          total_amount: totalWithShipping,
          payment_method: orderData.payment_method,
          status: "pending",
        }
      ])
      .select()
      .single();

    if (orderInsertError) {
      return NextResponse.json(
        { error: `Failed to create order: ${orderInsertError.message}`, code: "ORDER_CREATION_FAILED" },
        { status: 500 }
      );
    }

    // 4. Insert order items & update product stock securely
    const orderItemsToInsert = orderData.items.map((item) => {
      const dbProduct = productMap.get(item.product_id)!;
      return {
        order_id: orderId,
        product_id: item.product_id,
        product_name: dbProduct.name_en,
        price: Number(dbProduct.price),
        quantity: item.quantity,
      };
    });

    const { error: itemsInsertError } = await supabase
      .from("order_items")
      .insert(orderItemsToInsert);

    if (itemsInsertError) {
      // Rollback order if items fail to insert
      await supabase.from("orders").delete().eq("id", orderId);
      return NextResponse.json(
        { error: "Failed to log order details.", code: "ITEMS_CREATION_FAILED" },
        { status: 500 }
      );
    }

    // Decrement stock for each item
    for (const item of orderData.items) {
      const dbProduct = productMap.get(item.product_id)!;
      const newStock = dbProduct.stock - item.quantity;
      
      await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.product_id);
    }

    // Return receipt
    return NextResponse.json(
      { 
        success: true, 
        message: "Order placed successfully! / تم تسجيل طلبك بنجاح!", 
        orderId: orderId,
        total: totalWithShipping,
        shippingFee: finalShippingFee
      }, 
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
