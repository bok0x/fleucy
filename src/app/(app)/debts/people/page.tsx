'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebts } from '@/features/debts/queries';
import {
  createPersonAction,
  deletePersonAction,
  updatePersonAction,
} from '@/features/people/actions';
import { PEOPLE_KEY, usePeople } from '@/features/people/queries';
import type { Person } from '@/features/people/schemas';

function PersonForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const r = await createPersonAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PEOPLE_KEY });
      toast.success('Person added');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutate(new FormData(e.currentTarget));
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="p-name">Full name *</Label>
        <Input id="p-name" name="full_name" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="p-phone">Phone</Label>
        <Input id="p-phone" name="phone" type="tel" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="p-email">Email</Label>
        <Input id="p-email" name="email" type="email" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="p-tag">Relationship</Label>
        <Input id="p-tag" name="relationship_tag" placeholder="e.g. Friend, Family, Colleague" />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Saving…' : 'Add person'}
      </Button>
    </form>
  );
}

function EditPersonForm({ person, onSuccess }: { person: Person; onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const r = await updatePersonAction(person.id, fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PEOPLE_KEY });
      toast.success('Person updated');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutate(new FormData(e.currentTarget));
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor={`edit-name-${person.id}`}>Full name *</Label>
        <Input
          id={`edit-name-${person.id}`}
          name="full_name"
          defaultValue={person.full_name}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`edit-phone-${person.id}`}>Phone</Label>
        <Input
          id={`edit-phone-${person.id}`}
          name="phone"
          type="tel"
          defaultValue={person.phone ?? ''}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`edit-email-${person.id}`}>Email</Label>
        <Input
          id={`edit-email-${person.id}`}
          name="email"
          type="email"
          defaultValue={person.email ?? ''}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`edit-tag-${person.id}`}>Relationship</Label>
        <Input
          id={`edit-tag-${person.id}`}
          name="relationship_tag"
          defaultValue={person.relationship_tag ?? ''}
          placeholder="e.g. Friend, Family, Colleague"
        />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}

export default function PeoplePage() {
  const { data, isLoading, isError, refetch } = usePeople();
  const { data: owedToMeDebts } = useDebts('owed_to_me');
  const { data: iOweDebts } = useDebts('i_owe');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [filter, setFilter] = useState<'all' | 'owed_to_me' | 'i_owe'>('all');
  const queryClient = useQueryClient();
  const { mutate: removePerson, isPending: deleting } = useMutation({
    mutationFn: async (id: string) => {
      const r = await deletePersonAction(id);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PEOPLE_KEY });
      toast.success('Person removed');
    },
    onError: (e) => toast.error(e.message),
  });

  const owedToMePersonIds = new Set((owedToMeDebts ?? []).map((d) => d.person_id));
  const iOwePersonIds = new Set((iOweDebts ?? []).map((d) => d.person_id));

  const filteredPeople = (data ?? []).filter((person) => {
    if (filter === 'owed_to_me') return owedToMePersonIds.has(person.id);
    if (filter === 'i_owe') return iOwePersonIds.has(person.id);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">People</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              Add person
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New person</DialogTitle>
            </DialogHeader>
            <PersonForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'owed_to_me' | 'i_owe')}>
        <TabsList>
          <TabsTrigger value="all">All ({(data ?? []).length})</TabsTrigger>
          <TabsTrigger value="owed_to_me">People who owe me ({owedToMePersonIds.size})</TabsTrigger>
          <TabsTrigger value="i_owe">People I owe ({iOwePersonIds.size})</TabsTrigger>
        </TabsList>
      </Tabs>
      <Dialog open={!!editingPerson} onOpenChange={(open) => !open && setEditingPerson(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit person</DialogTitle>
          </DialogHeader>
          {editingPerson ? (
            <EditPersonForm person={editingPerson} onSuccess={() => setEditingPerson(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
      {isError ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-6 text-center">
          <p className="text-sm text-[var(--color-muted)]">Could not load people.</p>
          <button type="button" onClick={() => refetch()} className="mt-3 text-sm underline">
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      ) : (
        <div className="space-y-2">
          {filteredPeople.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--color-muted)]">
              {filter === 'all' ? 'No people yet.' : 'No people in this filter.'}
            </p>
          )}
          {filteredPeople.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3"
            >
              <User className="size-5 text-[var(--color-muted)]" />
              <div className="flex-1">
                <p className="font-medium">{p.full_name}</p>
                {p.phone && <p className="text-xs text-[var(--color-muted)]">{p.phone}</p>}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setEditingPerson(p)}
                aria-label="Edit person"
              >
                <Pencil className="size-4" />
              </Button>
              <ConfirmDialog
                title="Delete person"
                description={`Delete ${p.full_name}? This cannot be undone.`}
                confirmLabel="Delete"
                variant="destructive"
                disabled={deleting}
                onConfirm={() => removePerson(p.id)}
                trigger={
                  <Button size="icon" variant="ghost" aria-label="Delete person">
                    <Trash2 className="size-4 text-[var(--color-danger)]" />
                  </Button>
                }
              />
              {p.relationship_tag && (
                <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
                  {p.relationship_tag}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
