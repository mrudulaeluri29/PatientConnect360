import type { CarePlanItemType } from "../api/carePlans";

const CARE_PLAN_ITEM_TYPE_LABELS: Record<CarePlanItemType, string> = {
  PROBLEM: "Problem",
  GOAL: "Goal",
  INTERVENTION: "Intervention",
};

/** Human-readable label for a care plan item `type` (matches patient portal badges). */
export function formatCarePlanItemTypeLabel(type: CarePlanItemType): string {
  return CARE_PLAN_ITEM_TYPE_LABELS[type] ?? type;
}

/** Staff dropdown options (value is stored enum). */
export const CARE_PLAN_ITEM_TYPE_SELECT_OPTIONS: { value: CarePlanItemType; label: string }[] = [
  { value: "PROBLEM", label: "Problem" },
  { value: "GOAL", label: "Goal" },
  { value: "INTERVENTION", label: "Intervention" },
];
