import { estimateService } from './config';
import {
  getServiceOrderById,
  getServiceOrders,
  saveServiceOrder,
  ServiceOrderResponse,
} from '@/data/services/orcamentoService';
import { deleteOrcamentoItem } from '@/data/services/orcamentoItemService';
import { ServiceOrder } from '@/pages/ServiceOrderNew/types';

type FilterOption = 'vehicle' | 'customer';

const ServiceOrderAPI = {
  get: (
    searchValue = '',
    page = 1,
    filter: FilterOption = 'vehicle',
  ): Promise<ServiceOrderResponse> => getServiceOrders(searchValue, page, filter),

  getById: (id: string | number): Promise<ServiceOrder> => getServiceOrderById(id),

  put: async (serviceOrder: ServiceOrder) => {
    const savedOrder = await saveServiceOrder(serviceOrder);
    return { data: savedOrder };
  },

  deleteItem: (itemId: string | number) => deleteOrcamentoItem(itemId),

  // Alias legado para manter compatibilidade com código existente.
  delete: (itemId: string | number) => deleteOrcamentoItem(itemId),

  uploadVehicleImage: ({ imageFile, orderId, description }: { imageFile: File; orderId?: string; description: string }) => {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('order_id', orderId || '');
    formData.append('service_id', orderId || '');
    formData.append('file_type', 'new');
    formData.append('description', description);

    return estimateService.put('service/photo', formData);
  },

  getImages: (orderId: string) => estimateService.get(`${orderId}/service/photo`),
};

export default ServiceOrderAPI;
