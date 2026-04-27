'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPersonAction } from '@/features/people/actions';
import { PEOPLE_KEY, usePeople } from '@/features/people/queries';

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

export default function PeoplePage() {
  const { data, isLoading } = usePeople();
  const [createOpen, setCreateOpen] = useState(false);

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
      {isLoading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      ) : (
        <div className="space-y-2">
          {(data ?? []).length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--color-muted)]">No people yet.</p>
          )}
          {(data ?? []).map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3"
            >
              <User className="size-5 text-[var(--color-muted)]" />
              <div className="flex-1">
                <p className="font-medium">{p.full_name}</p>
                {p.phone && <p className="text-xs text-[var(--color-muted)]">{p.phone}</p>}
              </div>
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
