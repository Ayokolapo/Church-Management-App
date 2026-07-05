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
    timesAttended: string;
    lastAttended: string;
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
      timesAttended: "",
      lastAttended: "",
    });
  };

  const ALL = "__all__";
  const toSelectValue = (v: string) => v || ALL;
  const fromSelectValue = (v: string) => v === ALL ? "" : v;

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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={toSelectValue(filters.status)}
              onValueChange={(value) => onFiltersChange({ ...filters, status: fromSelectValue(value) })}
            >
              <SelectTrigger data-testid="select-filter-status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Statuses</SelectItem>
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
              value={toSelectValue(filters.gender)}
              onValueChange={(value) => onFiltersChange({ ...filters, gender: fromSelectValue(value) })}
            >
              <SelectTrigger data-testid="select-filter-gender">
                <SelectValue placeholder="All Genders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Occupation</Label>
            <Select
              value={toSelectValue(filters.occupation)}
              onValueChange={(value) => onFiltersChange({ ...filters, occupation: fromSelectValue(value) })}
            >
              <SelectTrigger data-testid="select-filter-occupation">
                <SelectValue placeholder="All Occupations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Occupations</SelectItem>
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
              value={toSelectValue(filters.cluster)}
              onValueChange={(value) => onFiltersChange({ ...filters, cluster: fromSelectValue(value) })}
            >
              <SelectTrigger data-testid="select-filter-cluster">
                <SelectValue placeholder="All Clusters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Clusters</SelectItem>
                {clusters?.map((cluster) => (
                  <SelectItem key={cluster.id} value={cluster.name}>
                    {cluster.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Times Attended</Label>
            <Select
              value={toSelectValue(filters.timesAttended)}
              onValueChange={(value) => onFiltersChange({ ...filters, timesAttended: fromSelectValue(value) })}
            >
              <SelectTrigger data-testid="select-filter-times-attended">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any</SelectItem>
                <SelectItem value="never">Never (0)</SelectItem>
                <SelectItem value="1-3">1 – 3 times</SelectItem>
                <SelectItem value="4-9">4 – 9 times</SelectItem>
                <SelectItem value="10-19">10 – 19 times</SelectItem>
                <SelectItem value="20+">20+ times</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Last Attended</Label>
            <Select
              value={toSelectValue(filters.lastAttended)}
              onValueChange={(value) => onFiltersChange({ ...filters, lastAttended: fromSelectValue(value) })}
            >
              <SelectTrigger data-testid="select-filter-last-attended">
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any time</SelectItem>
                <SelectItem value="within30">Last 30 days</SelectItem>
                <SelectItem value="within90">Last 90 days</SelectItem>
                <SelectItem value="within180">Last 180 days</SelectItem>
                <SelectItem value="over30">31+ days ago</SelectItem>
                <SelectItem value="over90">91+ days ago</SelectItem>
                <SelectItem value="over180">181+ days ago</SelectItem>
                <SelectItem value="over365">1+ year ago</SelectItem>
                <SelectItem value="never">Never attended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
