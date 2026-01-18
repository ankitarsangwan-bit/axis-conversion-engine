import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type KycCategory = 'not_eligible' | 'by_login' | 'by_vkyc' | 'by_non_core' | 'kyc_pending';

interface KycRecordsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: KycCategory | null;
  categoryLabel: string;
}

interface MISRecord {
  application_id: string;
  login_status: string | null;
  vkyc_status: string | null;
  final_status: string | null;
  core_non_core: string | null;
  blaze_output: string | null;
  state: string | null;
  month: string;
}

const VALID_LOGIN = ['LOGIN', 'LOGIN 26'];
const VKYC_DONE = ['APPROVED', 'REJECTED'];

function categorizeRecord(r: MISRecord): KycCategory {
  const loginStatus = (r.login_status || '').toUpperCase().trim();
  const vkycStatus = (r.vkyc_status || '').toUpperCase().trim();
  const coreNonCore = (r.core_non_core || '').toUpperCase().trim();
  const blazeOutput = (r.blaze_output || '').toUpperCase().trim();

  // Step 1: kyc_eligible from blaze_output (Reject = N, else Y)
  const kycEligible = !(blazeOutput === 'REJECT' || blazeOutput === 'REJECTED');

  if (!kycEligible) {
    return 'not_eligible';
  }

  // Step 2: For eligible records, determine kyc_done (priority order)
  if (VALID_LOGIN.includes(loginStatus)) {
    return 'by_login';
  } else if (VKYC_DONE.includes(vkycStatus)) {
    return 'by_vkyc';
  } else if (coreNonCore === 'NON-CORE') {
    return 'by_non_core';
  } else {
    // kyc_pending = eligible AND NOT done
    return 'kyc_pending';
  }
}

export function KycRecordsDialog({ open, onOpenChange, category, categoryLabel }: KycRecordsDialogProps) {
  const [records, setRecords] = useState<MISRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!open || !category) return;

    async function fetchRecords() {
      setIsLoading(true);
      try {
        // Fetch records and filter by category
        let allRecords: MISRecord[] = [];
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: batch, error } = await supabase
            .from('mis_records')
            .select('application_id, login_status, vkyc_status, final_status, core_non_core, blaze_output, state, month')
            .range(from, from + batchSize - 1);

          if (error || !batch) break;
          
          allRecords = [...allRecords, ...batch];
          from += batchSize;
          hasMore = batch.length === batchSize;
        }

        // Filter by category
        const filtered = allRecords.filter(r => categorizeRecord(r) === category);
        setTotalCount(filtered.length);
        // Show first 100 records for performance
        setRecords(filtered.slice(0, 100));
      } catch (err) {
        console.error('Error fetching records:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecords();
  }, [open, category]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {categoryLabel} Records
            <Badge variant="secondary" className="ml-2">
              {totalCount.toLocaleString()} total
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application ID</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Login Status</TableHead>
                  <TableHead>VKYC Status</TableHead>
                  <TableHead>Final Status</TableHead>
                  <TableHead>Core/Non-Core</TableHead>
                  <TableHead>Blaze Output</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.application_id}>
                      <TableCell className="font-mono text-xs">{record.application_id}</TableCell>
                      <TableCell>{record.month}</TableCell>
                      <TableCell>{record.state || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={record.login_status ? 'default' : 'outline'} className="text-xs">
                          {record.login_status || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.vkyc_status ? 'secondary' : 'outline'} className="text-xs">
                          {record.vkyc_status || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.final_status || '-'}</TableCell>
                      <TableCell>{record.core_non_core || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={record.blaze_output?.toUpperCase() === 'REJECT' ? 'destructive' : 'outline'} 
                          className="text-xs"
                        >
                          {record.blaze_output || 'N/A'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {records.length < totalCount && (
              <p className="text-center text-xs text-muted-foreground py-4">
                Showing first 100 of {totalCount.toLocaleString()} records
              </p>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}