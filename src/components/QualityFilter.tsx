import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type QualityLevel = 'all' | 'Good' | 'Average' | 'Rejected';

interface QualityFilterProps {
  value: QualityLevel;
  onChange: (value: QualityLevel) => void;
}

export function QualityFilter({ value, onChange }: QualityFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as QualityLevel)}>
      <SelectTrigger className="h-7 w-[120px] text-xs">
        <SelectValue placeholder="All Quality" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Quality</SelectItem>
        <SelectItem value="Good">Good</SelectItem>
        <SelectItem value="Average">Average</SelectItem>
        <SelectItem value="Rejected">Rejected</SelectItem>
      </SelectContent>
    </Select>
  );
}
