import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function unauthorized() {
  return err("Unauthorized", 401);
}

export function forbidden() {
  return err("Forbidden", 403);
}

export function notFound(resource = "Resource") {
  return err(`${resource} not found`, 404);
}
