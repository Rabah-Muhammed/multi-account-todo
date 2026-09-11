import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/app/lib/auth0";

function getBackendUrl(): string {
  let url = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api").trim();
  url = url.replace(/\/+$/, "");
  if (!url.endsWith("/api")) {
    url = `${url}/api`;
  }
  return url;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { token } = await auth0.getAccessToken();
    const body = await request.json();
    const backendUrl = getBackendUrl();

    const res = await fetch(`${backendUrl}/todos/${id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || `Backend returned HTTP ${res.status}` };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update todo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { token } = await auth0.getAccessToken();
    const backendUrl = getBackendUrl();

    const res = await fetch(`${backendUrl}/todos/${id}/`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || `Backend returned HTTP ${res.status}` };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete todo" },
      { status: 500 }
    );
  }
}