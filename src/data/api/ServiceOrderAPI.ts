import { ServiceOrder } from '@/pages/ServiceOrder/types';
import { api, estimateService } from './config';
import { AxiosResponse } from 'axios';

interface IUploadVehicleImage {
  imageFile: File;
  orderId?: string;
  description: string;
}

const createServiceOrderAPI = () => ({
  get: (
    searchValue = '',
    page = 1,
    filter: 'vehicle' | 'customer' = 'vehicle',
  ): Promise<AxiosResponse> => {
    return api.get('service_orders/search', {
      params: { [filter]: searchValue, page, startDate: null, endDate: null },
    });
  },
  put: (serviceOrder: Partial<ServiceOrder>): Promise<AxiosResponse<ServiceOrder>> => {
    const filteredSO: ServiceOrder = Object.keys(serviceOrder).reduce((acc, key) => {
      const value = serviceOrder[key as keyof ServiceOrder];
      if (value) {
        (acc as any)[key as keyof ServiceOrder] = value;
      }
      return acc;
    }, {} as ServiceOrder);

    return api.post('service_orders', filteredSO);
  },
  delete: (uuid: string) => {
    return api.delete(`service_order_items/${uuid}`);
  },
  uploadVehicleImage: ({ imageFile, orderId }: IUploadVehicleImage) => {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('order_id', orderId || '');
    formData.append('service_id', orderId || '');
    formData.append('file_type', 'new');

    return estimateService.put('service/photo', formData);
  },
  getImages: (orderId: string) => {
    return estimateService.get(orderId + '/service/photo');
  },
});

const ServiceOrderAPI = createServiceOrderAPI();
export default ServiceOrderAPI;
