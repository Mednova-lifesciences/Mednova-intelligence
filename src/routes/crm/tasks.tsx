import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { CrmShell, CrmHeader, btnPrimary, btnGhost, inputClass } from "@/components/crm/CrmShell";
import {
  fetchTasks,
  fetchCompanies,
  createTask,
  setTaskState,
  updateTask,
  TASK_TYPES,
  TASK_STATES,
  type Task,
  type TaskState,
} from "@/lib/crm-queries";

export const Route = createFileRoute("/crm/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks | MedNovaOS CRM" },
      { name: "description", content: "Create, edit, complete and delete CRM tasks tied to companies and follow-ups." },
      { property: "og:title", content: "Tasks | MedNovaOS CRM" },
      { property: "og:description", content: "CRM tasks, due dates and follow-ups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TasksPage,
});

const FILTERS = ["All", "Open", "Completed", "Deleted"] as const;

function TasksPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<string>("Follow-up");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("MedNovaOS");

  const { data: tasks } = useQuery({ queryKey: ["crm-tasks", "all"], queryFn: () => fetchTasks() });
  const { data: companies } = useQuery({ queryKey: ["crm-companies"], queryFn: () => fetchCompanies() });

  const all = tasks ?? [];
  const open = all.filter((t) => t.state === "Not Started" || t.state === "In Progress");
  const completed = all.filter((t) => t.state === "Completed");
  const rows =
    filter === "Open" ? open : filter === "Completed" ? completed : filter === "Deleted" ? all.filter((t) => t.state === "Deleted") : all.filter((t) => t.state !== "Deleted");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["crm-tasks"] });
    qc.invalidateQueries({ queryKey: ["crm-stats"] });
    qc.invalidateQueries({ queryKey: ["crm-activities"] });
  };

  const reset = () => {
    setFormOpen(false);
    setEditing(null);
    setTitle("");
    setDueDate("");
    setTaskType("Follow-up");
    setCompanyId("");
  };

  const save = async () => {
    if (!title.trim()) return;
    if (editing) {
      await updateTask(editing.id, {
        title,
        task_type: taskType,
        due_date: dueDate || null,
        assignee,
        company_id: companyId || null,
      });
    } else {
      await createTask({
        company_id: companyId || null,
        title,
        task_type: taskType,
        due_date: dueDate || null,
        assignee,
      });
    }
    reset();
    refresh();
  };

  const move = async (t: Task, state: TaskState) => {
    await setTaskState(t, state);
    refresh();
  };

  return (
    <CrmShell>
      <CrmHeader
        title="Tasks"
        subtitle={`${open.length} open · ${completed.length} completed`}
        actions={
          <button className={btnPrimary} onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> New task
          </button>
        }
      />

      <div className="px-8 py-6">
        {formOpen && (
          <div className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <select className={inputClass} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">No company</option>
                {(companies ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input className={inputClass} placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <select className={inputClass} value={taskType} onChange={(e) => setTaskType(e.target.value)}>
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input className={inputClass} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <input className={inputClass} value={assignee} onChange={(e) => setAssignee(e.target.value)} />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button className={btnGhost} onClick={reset}>
                Cancel
              </button>
              <button className={btnPrimary} onClick={save}>
                Save task
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-9 rounded-lg px-4 text-sm font-medium ${
                filter === f ? "bg-navy text-navy-foreground" : "border border-border bg-card text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No tasks here.
                  </td>
                </tr>
              )}
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  <td className="px-4 py-3">{t.task_type}</td>
                  <td className="px-4 py-3">{t.companies?.name ?? "—"}</td>
                  <td className="px-4 py-3">{t.due_date ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                      value={t.state}
                      onChange={(e) => move(t, e.target.value as TaskState)}
                    >
                      {TASK_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">{t.assignee ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 text-xs">
                      <button
                        className="rounded border border-border px-2 py-1"
                        onClick={() => {
                          setEditing(t);
                          setFormOpen(true);
                          setTitle(t.title);
                          setTaskType(t.task_type);
                          setDueDate(t.due_date ?? "");
                          setAssignee(t.assignee ?? "");
                          setCompanyId(t.company_id ?? "");
                        }}
                      >
                        Edit
                      </button>
                      {t.state !== "Completed" && (
                        <button className="rounded border border-border px-2 py-1" onClick={() => move(t, "Completed")}>
                          Complete
                        </button>
                      )}
                      {t.state !== "Deleted" && (
                        <button
                          className="rounded border border-border px-2 py-1 text-destructive"
                          onClick={() => move(t, "Deleted")}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Deleted tasks stay recoverable for 2 days and are then removed automatically.
        </p>
      </div>
    </CrmShell>
  );
}
