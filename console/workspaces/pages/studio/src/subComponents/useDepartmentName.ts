import { useListDepartments } from "@workspacenow/api-client";

export function useDepartmentName(): (id: string) => string {
  const { data } = useListDepartments();
  return (id) => data?.items.find((d) => d.id === id)?.name ?? id;
}
