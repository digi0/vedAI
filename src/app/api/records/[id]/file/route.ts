import { getSessionUser, serverAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Force a sensible inline content-type from the extension (Storage objects are
// sometimes stored as octet-stream, which won't render in the browser).
const MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  bmp: "image/bmp",
};

/**
 * Streams a record's stored file from our own origin. Because it's same-origin
 * and served inline, the browser renders it directly in an <img>/<iframe> —
 * no client-side blob download, and none of the cross-origin framing issues
 * that come from pointing at a Supabase URL. Ownership is enforced: the record
 * must belong to the signed-in user.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const admin = serverAdmin();
  const { data: rec, error } = await admin
    .from("records")
    .select("file_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !rec?.file_path) return new Response("Not found", { status: 404 });

  const signed = await admin.storage
    .from("record-files")
    .createSignedUrl(rec.file_path, 60);
  if (signed.error || !signed.data?.signedUrl) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(signed.data.signedUrl);
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: 404 });
  }

  const ext = (rec.file_path.split(".").pop() ?? "").toLowerCase();
  const type =
    MIME[ext] || upstream.headers.get("content-type") || "application/octet-stream";

  return new Response(upstream.body, {
    headers: {
      "content-type": type,
      "content-disposition": "inline",
      "cache-control": "private, max-age=60",
    },
  });
}
