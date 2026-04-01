// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.

import { CustomerSchema } from "@/components/FormSheet/Customer/schema"
import { VehicleSchema } from "@/components/FormSheet/Vehicle/schema"

export type ServiceOrder = {
    uuid: string
    status: STATUS_SERVICE_ORDER,
    createdAt: string,
    updatedAt?: string,
    startAt: string,
    endAt?: string,
    note?: string,
    insurance_company?: string,
    duration_quantity: number,
    duration_type: "hour" | "day" | "week" | "month" | "year",
    images: string[]
    customer: CustomerSchema,
    vehicle: VehicleSchema,
    items: ServiceOrderItem[] | [],
    service_order_items: ServiceOrderItem[] | []
}

export type ServiceOrderItem = {
    uuid: string
    type: string
    description: string,
    quantity: number,
    value: number,
    discount: number,
    insurance_coverage: number,
    total: number
}

export type ServiceOrderVehicle = {
    plate: string,
    description?: string,
    brand: string,
    model: string,
    year: string
}

export enum STATUS_SERVICE_ORDER {
    PENDING = "pending",
    WAITING_APPROVAL = "waiting_approval",
    SCHEDULED = 'scheduled',
    APPROVED = "approved",
    TODO = "todo",
    DOING = "doing",
    READY = "ready",
    DONE = "done",
    BLOCKED = "blocked",
    CANCELLED = "cancelled",
    REJECTED = "rejected"
}