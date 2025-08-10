"use client";

import React, { useState, useMemo } from 'react';
import { PlusCircle, MoreHorizontal, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/page-header';
import { contracts as mockContracts } from '@/lib/mock-data';
import type { Contract } from '@/lib/types';

const ITEMS_PER_PAGE = 10;

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>(mockContracts);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredContracts = useMemo(() => {
    return contracts.filter(
      (contract) =>
        contract.contractorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contracts, searchTerm]);

  const paginatedContracts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredContracts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredContracts, currentPage]);

  const totalPages = Math.ceil(filteredContracts.length / ITEMS_PER_PAGE);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };
  
  const handleDelete = (id: string) => {
    setContracts(contracts.filter(c => c.id !== id));
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader>
        <div className="flex items-center justify-between">
            <div>
                <PageHeaderHeading>Contracts</PageHeaderHeading>
                <PageHeaderDescription>
                Manage, view, and organize all your contracts.
                </PageHeaderDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Contract
            </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                 <CardTitle>Contract List</CardTitle>
                <div className="w-full max-w-sm">
                    <Input
                        placeholder="Search by contractor, ID, or type..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
            </div>
            <CardDescription>A list of all contracts in your system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract ID</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedContracts.length > 0 ? (
                  paginatedContracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{contract.id}</TableCell>
                      <TableCell>{contract.contractorName}</TableCell>
                      <TableCell>{contract.type}</TableCell>
                      <TableCell>
                        <Badge variant={contract.status === 'active' ? 'default' : 'secondary'} className={contract.status === 'active' ? 'bg-green-500' : ''}>
                          {contract.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{contract.endDate}</TableCell>
                      <TableCell>{contract.unit}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(contract.id)} className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                           <FileText className="h-8 w-8 text-muted-foreground" />
                           <p className="font-semibold">No contracts found.</p>
                           <p className="text-muted-foreground text-sm">Try adjusting your search or add a new contract.</p>
                        </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
