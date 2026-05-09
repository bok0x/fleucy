'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createCategoryAction, updateCategoryAction } from '@/features/categories/actions';
import { CATEGORIES_KEY, useCategories } from '@/features/categories/queries';
import type { Category } from '@/features/categories/schemas';

interface CategoryFormProps {
  onSuccess: () => void;
  defaultValues?: Category;
}

function CategoryForm({ onSuccess, defaultValues }: CategoryFormProps) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const r = defaultValues
        ? await updateCategoryAction(defaultValues.id, fd)
        : await createCategoryAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      toast.success(defaultValues ? 'Category updated' : 'Category created');
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
      {!defaultValues && (
        <div className="space-y-1">
          <Label htmlFor="cat-type">Type</Label>
          <Select name="type" defaultValue="expense">
            <SelectTrigger id="cat-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {defaultValues && <input type="hidden" name="type" value={defaultValues.type} />}
      <div className="space-y-1">
        <Label htmlFor="cat-name">Name</Label>
        <Input id="cat-name" name="name" defaultValue={defaultValues?.name} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="cat-color">Color</Label>
        <Input
          id="cat-color"
          name="color"
          type="color"
          defaultValue={defaultValues?.color ?? '#6b7280'}
          className="h-10 w-full cursor-pointer"
        />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Saving…' : defaultValues ? 'Update' : 'Create category'}
      </Button>
    </form>
  );
}

function CategoryList({ type }: { type: 'income' | 'expense' }) {
  const { data, isLoading, isError, refetch } = useCategories(type);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New {type} category</DialogTitle>
            </DialogHeader>
            <CategoryForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isError ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-6 text-center">
          <p className="text-sm text-[var(--color-muted)]">Could not load categories.</p>
          <button type="button" onClick={() => refetch()} className="mt-3 text-sm underline">
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      ) : (
        <div className="space-y-1">
          {(data ?? []).map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            >
              <span
                className="size-3 flex-shrink-0 rounded-full"
                style={{ background: cat.color }}
              />
              <span className="flex-1 text-sm">{cat.name}</span>
              {cat.is_system ? (
                <span className="text-xs text-[var(--color-muted)]">system</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditTarget(cat)}
                  className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                >
                  Edit
                </button>
              )}
            </div>
          ))}
          {(data ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--color-muted)]">No categories yet.</p>
          )}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <CategoryForm defaultValues={editTarget} onSuccess={() => setEditTarget(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Categories</h1>
      <Tabs defaultValue="expense">
        <TabsList>
          <TabsTrigger value="expense">Expense</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
        </TabsList>
        <TabsContent value="expense" className="mt-4">
          <CategoryList type="expense" />
        </TabsContent>
        <TabsContent value="income" className="mt-4">
          <CategoryList type="income" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
