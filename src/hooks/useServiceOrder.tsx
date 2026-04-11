import { DEFAULT_SELECTION, ICarSelectionValue } from "@/components/CarPartsSelector/types";
import { CustomerSchema, DEFAULT_CUSTOMER_VALUE } from "@/components/FormSheet/Customer/schema";
import { DEFAULT_VEHICLE_VALUES, VehicleSchema } from "@/components/FormSheet/Vehicle/schema";
import { STATUS_SERVICE_ORDER, ServiceOrder, ServiceOrderItem } from "@/pages/ServiceOrder/types";
import { create } from "zustand";
import { nanoid } from 'nanoid/non-secure'

interface ServiceOrderStore {
  id: any,
  status: STATUS_SERVICE_ORDER,
  startAt: any,
  endAt: any,
  note: string,
  customer: any,
  vehicle: any,
  service_order_items: ServiceOrderItem[],
  car_map: any,
  setId: (id: string) => Promise<any>,
  setStatus: (status: STATUS_SERVICE_ORDER | string) => Promise<any>,
  setNote: (note: string) => Promise<any>,
  setStartDate: (startAt: string) => Promise<any>,
  setEndDate: (endAt: string) => Promise<any>,
  setCustomer: (customer: CustomerSchema) => Promise<any>,
  setVehicle: (vehicle: VehicleSchema) => Promise<any>,
  setItems: (service_order_items: ServiceOrderItem[]) => Promise<any>,
  setCarMap: (car_map: ICarSelectionValue) => Promise<any>,
  setServiceOrder: (serviceOrder:ServiceOrder) => Promise<any>,
  reset:() => Promise<any>
}

export const useServiceOrderStore = create<ServiceOrderStore>((set: any) => ({
    id: nanoid(),
    status: STATUS_SERVICE_ORDER.EM_ABERTO,
    startAt: '',
    endAt: '',
    note: '',
    customer: DEFAULT_CUSTOMER_VALUE,
    vehicle: DEFAULT_VEHICLE_VALUES,
    service_order_items: [],
    car_map: DEFAULT_SELECTION,
    setId: (id: string) => set(() => ({id})),
    setStatus: (status: STATUS_SERVICE_ORDER | string) => set(() => ({status})),
    setNote: (note: string) => set(() => ({note})),
    setStartDate: (startAt) => set(() => ({startAt})),
    setEndDate: (endAt) => set(() => ({endAt})),
    setCustomer: (customer: CustomerSchema) => set(() => ({customer})),
    setVehicle: (vehicle: VehicleSchema) => set(() => ({vehicle})),
    setItems: (service_order_items: ServiceOrderItem[]) => set(() => ({service_order_items})),
    setCarMap: (car_map: ICarSelectionValue) => set(() => ({car_map})),
    setServiceOrder: (serviceOrder) => set(() => ({...serviceOrder})),
    reset: () => set(() => ({id: nanoid(),status: STATUS_SERVICE_ORDER.EM_ABERTO,customer: DEFAULT_CUSTOMER_VALUE,vehicle: DEFAULT_VEHICLE_VALUES,service_order_items: [],car_map: DEFAULT_SELECTION, startAt: null, endAt: null, note: null}))
  }))
