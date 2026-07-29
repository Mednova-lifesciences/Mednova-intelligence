import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, PinOff, Pencil, Trash2 } from "lucide-react";
import { CrmShell, CrmHeader, CrmCard, btnPrimary, btnGhost, inputClass } from "@/components/crm/CrmShell";
import { fetchNotes, createNote, updateNote, deleteNote, type Note, type NoteRow } from "@/lib/crm-queries";

export const Route = createFileRoute("/crm/notes")({
  head: () => ({
    meta: [
      { title: "Notes | MedNovaOS CRM" },
      {
        name: "description",
        content: "Standalone CRM notebook for meeting reminders, business ideas, market observations and follow-ups.",
      },
      { property: "og:title", content: "Notes | MedNovaOS CRM" },
      { property: "og:description", content: "CRM notebook with pinned notes, search and sorting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotesPage,
});

export function NoteEditor({
  companyId,
  onSaved,
  note,
  onCancel,
}: {
  companyId: string | null;
  onSaved: () => void;
  note?: Note;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!body.trim() && !title.trim()) return;
    setBusy(true);
    try {
      if (note) await updateNote(note, { title: title || "Untitled note", body });
      else await createNote({ company_id: companyId, title, body });
      setTitle("");
      setBody("");
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <input className={inputClass} placeholder="Note title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea
        className="min-h-[120px] w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-brand"
        placeholder="Write your note..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button className={btnGhost} onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className={btnPrimary} onClick={save} disabled={busy}>
          {busy ? "Saving…" : note ? "Update note" : "Save note"}
        </button>
      </div>
    </div>
  );
}

export function NoteList({
  notes,
  onChanged,
  showCompany = false,
}: {
  notes: NoteRow[];
  onChanged: () => void;
  showCompany?: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  if (notes.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">No notes yet.</p>;
  }

  return (
    <div className="grid gap-3">
      {notes.map((n) => (
        <div key={n.id} className="rounded-lg border border-border bg-background p-4">
          {editing === n.id ? (
            <NoteEditor
              companyId={n.company_id}
              note={n}
              onCancel={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                onChanged();
              }}
            />
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    {n.pinned && <Pin className="h-3.5 w-3.5 text-brand" />}
                    {n.title}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {showCompany && n.companies?.name ? `${n.companies.name} · ` : ""}
                    {n.author} · created {new Date(n.created_at).toLocaleString()} · updated{" "}
                    {new Date(n.updated_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    title={n.pinned ? "Unpin" : "Pin"}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={async () => {
                      await updateNote(n, { pinned: !n.pinned });
                      onChanged();
                    }}
                  >
                    {n.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </button>
                  <button
                    title="Edit"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setEditing(n.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    title="Delete"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={async () => {
                      await deleteNote(n);
                      onChanged();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{n.body}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function NotesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [filter, setFilter] = useState<"all" | "pinned" | "unpinned">("all");
  const [composing, setComposing] = useState(false);

  const { data } = useQuery({
    queryKey: ["crm-notes", "standalone", search, sort],
    queryFn: () => fetchNotes({ standaloneOnly: true, search, sort }),
  });

  const all = data ?? [];
  const notes = all.filter((n) => (filter === "all" ? true : filter === "pinned" ? n.pinned : !n.pinned));
  const pinned = notes.filter((n) => n.pinned);
  const rest = notes.filter((n) => !n.pinned);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["crm-notes"] });
    qc.invalidateQueries({ queryKey: ["crm-activities"] });
  };

  return (
    <CrmShell>
      <CrmHeader
        title="Notes"
        subtitle={`${all.length} standalone notes · company notes live on each company page`}
        actions={
          <button className={btnPrimary} onClick={() => setComposing((v) => !v)}>
            {composing ? "Close" : "New note"}
          </button>
        }
      />
      <div className="space-y-6 px-8 py-6">
        {composing && (
          <CrmCard>
            <h2 className="mb-3 text-base font-bold text-foreground">New note</h2>
            <NoteEditor
              companyId={null}
              onSaved={() => {
                setComposing(false);
                refresh();
              }}
            />
          </CrmCard>
        )}

        <CrmCard>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className={`${inputClass} max-w-xs`}
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option value="all">All notes</option>
              <option value="pinned">Pinned only</option>
              <option value="unpinned">Unpinned only</option>
            </select>
            <select
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </CrmCard>

        {pinned.length > 0 && (
          <CrmCard>
            <h2 className="mb-3 text-base font-bold text-foreground">Pinned notes</h2>
            <NoteList notes={pinned} onChanged={refresh} showCompany />
          </CrmCard>
        )}

        <CrmCard>
          <h2 className="mb-3 text-base font-bold text-foreground">All notes</h2>
          <NoteList notes={rest} onChanged={refresh} showCompany />
        </CrmCard>
      </div>
    </CrmShell>
  );
}
