import type { Metadata } from "next";
import Link from "next/link";
import { Copy, ExternalLink, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { LISTING_STATUSES, listingStatus, timeAgo } from "@/lib/admin/meta";
import { formatPrice } from "@/lib/format";
import { ActionButton } from "@/components/admin/forms";
import { Badge, ButtonLink, Empty, PageHeader, Table, button, td } from "@/components/admin/ui";
import { deleteProperty, duplicateProperty, setPropertyFlag } from "./actions";

export const metadata: Metadata = { title: "Properties" };

export default async function PropertiesAdminPage({ searchParams }: PageProps<"/admin/properties">) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";

  let query = db.from("properties").select("id, title, type, purpose, locality, price, images, status, featured, updated_at").order("sort_order").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`title.ilike.%${q.replace(/[%,()]/g, "")}%,locality.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data: rows, error } = await query;

  return (
    <>
      <PageHeader
        title="Properties"
        text="Everything here appears on the website within seconds of saving."
        actions={
          <ButtonLink href="/admin/properties/new">
            <Plus className="size-4" /> Add property
          </ButtonLink>
        }
      />

      <form className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input name="q" defaultValue={q} placeholder="Search title or locality…" className="field-sm sm:max-w-xs" />
        <select name="status" defaultValue={status} className="field-sm sm:w-40">
          <option value="">All statuses</option>
          {LISTING_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button className={button("outline")}>Filter</button>
        {(q || status) && (
          <Link href="/admin/properties" className={button("ghost", "h-9")}>
            Clear
          </Link>
        )}
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error.message}</p>}

      {!rows?.length ? (
        <Empty title={q || status ? "No matching properties" : "No properties yet"} action={<ButtonLink href="/admin/properties/new">Add your first property</ButtonLink>} />
      ) : (
        <Table head={["Property", "Price", "Status", "Featured", "Updated", ""]}>
          {rows.map((p) => {
            const st = listingStatus(p.status);
            return (
              <tr key={p.id} className="hover:bg-subtle/60">
                <td className={td}>
                  <Link href={`/admin/properties/${p.id}`} className="flex items-center gap-3">
                    <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-subtle">
                      {p.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt="" className="size-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{p.title}</span>
                      <span className="block truncate text-xs text-ink-soft">
                        {p.type} · {p.purpose === "Buy" ? "Sale" : "Rent"} · {p.locality}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  {formatPrice(Number(p.price))}
                  {p.purpose === "Rent" && <span className="text-ink-soft">/mo</span>}
                </td>
                <td className={td}>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </td>
                <td className={td}>
                  <ActionButton action={setPropertyFlag} fields={{ id: p.id, field: "featured", value: String(!p.featured) }} title={p.featured ? "Remove from homepage" : "Feature on homepage"}>
                    <Star className={`size-4 ${p.featured ? "fill-accent text-accent" : ""}`} />
                  </ActionButton>
                </td>
                <td className={`${td} text-xs whitespace-nowrap text-ink-soft`}>{timeAgo(p.updated_at)}</td>
                <td className={`${td} text-right whitespace-nowrap`}>
                  <Link href={`/admin/properties/${p.id}`} className={button("ghost")} title="Edit" aria-label="Edit">
                    <Pencil className="size-4" />
                  </Link>
                  <a href={`/properties/${p.id}`} target="_blank" className={button("ghost")} title="View on website" aria-label="View on website">
                    <ExternalLink className="size-4" />
                  </a>
                  <ActionButton action={duplicateProperty} fields={{ id: p.id }} title="Duplicate (without photos)">
                    <Copy className="size-4" />
                  </ActionButton>
                  <ActionButton action={deleteProperty} fields={{ id: p.id }} variant="danger" confirm={`Delete "${p.title}" and its photos? This can't be undone.`} title="Delete">
                    <Trash2 className="size-4" />
                  </ActionButton>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
