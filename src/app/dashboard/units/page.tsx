
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, MoreHorizontal, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/page-header';
import { units as mockUnits } from '@/lib/mock-data';
import type { Unit } from '@/lib/types';
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from '@/context/language-context';

const unitSchema = z.object({
  name: z.string().min(1, { message: "Unit name is required" }),
});

const ITEMS_PER_PAGE = 10;

export default function UnitsPage() {
  const { t } = useLanguage();
  const [units, setUnits] = useState<Unit[]>(mockUnits);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const form = useForm<z.infer<typeof unitSchema>>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (editingUnit) {
      form.reset({
        name: editingUnit.name,
      });
    } else {
      form.reset({
        name: "",
      });
    }
  }, [editingUnit, form]);


  const handleOpenDialog = (unit: Unit | null) => {
    setEditingUnit(unit);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingUnit(null);
    setIsDialogOpen(false);
    form.reset();
  }

  const onSubmit = (values: z.infer<typeof unitSchema>) => {
    if (editingUnit) {
      // Update existing unit
      const updatedUnit = { ...editingUnit, name: values.name };
      setUnits(units.map(u => u.id === editingUnit.id ? updatedUnit : u));
      toast({
        title: t('units.toast.updated_title'),
        description: t('units.toast.updated_desc', { name: updatedUnit.name }),
      });
    } else {
      // Create new unit
      const newUnit: Unit = {
        id: `UNIT-${String(units.length + 1).padStart(2, '0')}`,
        name: values.name,
        userCount: 0, // New units start with 0 users
      };
      setUnits([...units, newUnit]);
      toast({
          title: t('units.toast.created_title'),
          description: t('units.toast.created_desc', { name: newUnit.name }),
      });
    }
    handleCloseDialog();
  };
  
  const handleDelete = (id: string) => {
    setUnits(units.filter(u => u.id !== id));
    toast({
        title: t('units.toast.deleted_title'),
        description: t('units.toast.deleted_desc'),
        variant: "destructive",
    });
  }

  const filteredUnits = useMemo(() => {
    return units.filter(unit => 
        unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [units, searchTerm]);

  const paginatedUnits = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUnits.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUnits, currentPage]);

  const totalPages = Math.ceil(filteredUnits.length / ITEMS_PER_PAGE);

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div>
            <PageHeaderHeading>{t('units.title')}</PageHeaderHeading>
            <PageHeaderDescription>
              {t('units.description')}
            </PageHeaderDescription>
          </div>
          <Button onClick={() => handleOpenDialog(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('units.add_button')}
          </Button>
        </div>
      </PageHeader>
      
       <Dialog open={isDialogOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUnit ? t('units.dialog.edit_title') : t('units.dialog.add_title')}</DialogTitle>
            <DialogDescription>
              {editingUnit ? t('units.dialog.edit_desc') : t('units.dialog.add_desc')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('units.dialog.name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('units.dialog.name_placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="ghost">{t('common.cancel')}</Button>
                </DialogClose>
                <Button type="submit">{editingUnit ? t('common.save_changes') : t('units.dialog.create_button')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>


      <Card>
        <CardHeader>
          <CardTitle>{t('units.list_title')}</CardTitle>
           <CardDescription>{t('units.list_desc')}</CardDescription>
            <div className="mt-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder={t('units.search_placeholder')}
                        className="pl-10 max-w-sm"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">{t('units.table.name')}</TableHead>
                  <TableHead className="w-[30%]">{t('units.table.id')}</TableHead>
                  <TableHead className="w-[20%]">{t('units.table.user_count')}</TableHead>
                  <TableHead className="w-[10%] text-right">
                    <span className="sr-only">{t('common.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUnits.length > 0 ? paginatedUnits.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.name}</TableCell>
                    <TableCell>{unit.id}</TableCell>
                    <TableCell>{unit.userCount}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">{t('common.toggle_menu')}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenDialog(unit)}>{t('common.edit')}</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(unit.id)}
                            className="text-destructive"
                           >
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            {t('units.no_units_found')}
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {totalPages > 1 && (
            <CardFooter>
                <div className="flex w-full items-center justify-end space-x-2 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        {t('common.previous')}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        {t('common.page_of', { current: currentPage, total: totalPages })}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        {t('common.next')}
                    </Button>
                </div>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
