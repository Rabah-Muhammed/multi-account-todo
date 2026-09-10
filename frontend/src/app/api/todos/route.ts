import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/app/lib/auth0";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export async function GET(request: NextRequest) {
  try {
    const { token } = await auth0.getAccessToken();
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/todos/${searchParams ? `?${searchParams}` : ""}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch todos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await auth0.getAccessToken();
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/todos/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create todo" },
      { status: 500 }
    );
  }
}