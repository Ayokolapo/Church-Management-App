import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Cluster } from "@shared/schema";

interface MemberFiltersProps {
  filters: {
    status: string;
    gender: string;
    occupation: string;
    cluster: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function MemberFilters({ filters, onFiltersChange }: MemberFiltersProps) {
  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

  const clearFilters = () => {
    onFiltersChange({
      status: "",
      gender: "",
      occupation: "",
      cluster: "",
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Filters</h3>
          <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
            >
              <SelectTrigger data-testid="select-filter-status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="Crowd">Crowd</SelectItem>
                <SelectItem value="Potential">Potential</SelectItem>
                <SelectItem value="Committed">Committed</SelectItem>
                <SelectItem value="Volunteer">Volunteer</SelectItem>
                <SelectItem value="Worker">Worker</SelectItem>
                <SelectItem value="Leader">Leader</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={filters.gender}
              onValueChange={(value) => onFiltersChange({ ...filters, gender: value })}
            >
              <SelectTrigger data-testid="select-filter-gender">
                <SelectValue placeholder="All Genders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Occupation</Label>
            <Select
              value={filters.occupation}
              onValueChange={(value) => onFiltersChange({ ...filters, occupation: value })}
            >
              <SelectTrigger data-testid="select-filter-occupation">
                <SelectValue placeholder="All Occupations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Occupations</SelectItem>
                <SelectItem value="Students">Students</SelectItem>
                <SelectItem value="Workers">Workers</SelectItem>
                <SelectItem value="Unemployed">Unemployed</SelectItem>
                <SelectItem value="Self-Employed">Self-Employed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cluster</Label>
            <Select
              value={filters.cluster}
              onValueChange={(value) => onFiltersChange({ ...filters, cluster: value })}
            >
              <SelectTrigger data-testid="select-filter-cluster">
                <SelectValue placeholder="All Clusters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Clusters</SelectItem>
                {clusters?.map((cluster) => (
                  <SelectItem key={cluster.id} value={cluster.name}>
                    {cluster.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
