export const WORK_ORDER_STATUSES = [
  "New",
  "Diagnosing",
  "Waiting Approval",
  "Approved",
  "Waiting Parts",
  "In Progress",
  "Ready for Pickup",
  "Completed",
  "Cancelled",
] as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export interface Customer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
}

export interface Vehicle {
  id: string;
  customer_id: string;
  make: string;
  model: string;
  year: number | null;
  vin: string | null;
  engine_size: string | null;
  vehicle_type: string | null;
  notes: string | null;
  created_at: string;
  customers?: Pick<Customer, "full_name"> | null;
}

export interface WorkOrder {
  id: string;
  customer_id: string;
  vehicle_id: string;
  ro_number: string;
  status: WorkOrderStatus;
  problem_description: string | null;
  diagnosis_summary: string | null;
  approved: boolean;
  labor_total: number;
  parts_total: number;
  total: number;
  created_at: string;
  completed_at: string | null;
  customers?: Pick<Customer, "full_name" | "phone" | "email"> | null;
  vehicles?: Pick<Vehicle, "make" | "model" | "year" | "vin"> | null;
}

export interface Part {
  id: string;
  part_name: string;
  category: string | null;
  brand: string | null;
  oem_part_number: string | null;
  aftermarket_part_number: string | null;
  compatible_make: string | null;
  compatible_model: string | null;
  compatible_years: string | null;
  cost: number;
  sale_price: number;
  quantity: number;
  shelf_location: string | null;
  supplier: string | null;
  created_at: string;
}

export interface TechnicalEntry {
  id: string;
  make: string;
  model: string;
  year_start: number | null;
  year_end: number | null;
  category: string | null;
  title: string | null;
  spec_name: string | null;
  spec_value: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
}
