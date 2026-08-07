import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../client";
import { isRateLimited } from "../rate-limit";
import { productSchema } from "../../zod-schemas";

// 1. GET: Fetch all products or filter by category
export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    
    // Rate limit for reading: max 120 requests per minute
    const limitResult = isRateLimited(ip, { limit: 120, interval: 60000 });
    if (limitResult.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down.", code: "RATE_LIMIT_EXCEEDED" },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": "120",
            "X-RateLimit-Remaining": limitResult.remaining.toString(),
            "X-RateLimit-Reset": limitResult.reset.toString(),
          }
        }
      );
    }

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");

    let query = supabase
      .from("products")
      .select("*, categories(*)")
      .order("created_at", { ascending: false });

    if (category) {
      query = query.eq("category_id", category);
    }

    const { data: products, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message, code: "DATABASE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: products },
      {
        headers: {
          "X-RateLimit-Limit": "120",
          "X-RateLimit-Remaining": limitResult.remaining.toString(),
          "X-RateLimit-Reset": limitResult.reset.toString(),
        }
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

// 2. POST: Create a product (Only Admin Allowed)
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    
    // Strict Rate limit for mutations: max 10 requests per minute
    const limitResult = isRateLimited(ip, { limit: 10, interval: 60000 });
    if (limitResult.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before creating more products.", code: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }

    const supabase = await createClient();

    // Verify session & authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Authentication is required.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Verify Admin permission
    const { data: isAdmin, error: adminCheckError } = await supabase
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .single();

    if (adminCheckError || !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden. You do not have administrator permissions.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Parse and validate using Zod
    const body = await request.json();
    const validation = productSchema.safeParse(body);

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

    // Save product in Supabase
    const { data: product, error: insertError } = await supabase
      .from("products")
      .insert([validation.data])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message, code: "DATABASE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
