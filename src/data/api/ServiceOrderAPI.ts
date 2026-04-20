import { estimateService, supabase } from './config';
import {
  getServiceOrderById,
  getServiceOrders,
  getServiceOrdersByCustomerId,
  saveServiceOrder,
  ServiceOrderResponse,
  updateServiceOrderStatus,
} from '@/data/services/orcamentoService';
import { deleteOrcamentoItem } from '@/data/services/orcamentoItemService';
import { ServiceOrder, STATUS_SERVICE_ORDER } from '@/pages/ServiceOrderNew/types';

type FilterOption = 'vehicle' | 'customer';

type UploadVehicleImagePayload = {
  file?: File;
  imageFile?: File;
  order_id?: string;
  orderId?: string;
  service_id?: string;
  serviceId?: string;
  file_type?: string;
  fileType?: string;
  description?: string;
};

const PHOTO_BUCKET = 'orcamentos';
const ESTIMATE_REQUEST_TIMEOUT = 12_000;

const shouldTryAlternativeUploadRoute = (error: unknown) => {
  const status = Number((error as { response?: { status?: number } })?.response?.status || 0);
  const code = String((error as { code?: string })?.code || '');
  const hasResponse = Boolean((error as { response?: unknown })?.response);
  return (
    [400, 401, 403, 404, 405, 408, 415, 422, 429, 500, 501, 502, 503, 504].includes(status) ||
    !hasResponse ||
    ['ERR_NETWORK', 'ECONNABORTED', 'ERR_CANCELED'].includes(code)
  );
};

const logEstimateRouteFailure = (context: string, route: string, error: unknown, details?: Record<string, unknown>) => {
  const apiError = error as {
    message?: string;
    code?: string;
    response?: { status?: number; data?: unknown };
  };

  console.error(`[ServiceOrderAPI] ${context}`, {
    route,
    ...details,
    message: apiError?.message,
    code: apiError?.code,
    status: apiError?.response?.status,
    response: apiError?.response?.data,
  });
};

const normalizeFileName = (fileName: string) => String(fileName || 'image').replace(/[\\/]/g, '_');

const getObjectName = (orderId: string, fileName: string) => {
  const safeFileName = normalizeFileName(fileName);
  return orderId ? `${orderId}/${safeFileName}` : safeFileName;
};

const buildUploadFormData = ({
  file,
  orderId,
  serviceId,
  fileType,
  description,
}: {
  file: File;
  orderId: string;
  serviceId: string;
  fileType: string;
  description: string;
}) => {
  const objectName = getObjectName(orderId, file.name);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('order_id', orderId);
  formData.append('service_id', serviceId);
  formData.append('file_type', fileType);
  formData.append('description', description);
  formData.append('bucket', PHOTO_BUCKET);
  formData.append('object_name', objectName);
  formData.append('original_file_name', file.name);
  // Campos legados para manter compatibilidade com versoes anteriores do estimate-svc.
  formData.append('orderId', orderId);
  formData.append('serviceId', serviceId);
  formData.append('fileType', fileType);
  return formData;
};

const getSignedOrPublicUrl = async (objectName: string) => {
  const { data: publicData } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(objectName);
  try {
    const { data: signedData, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(objectName, 60 * 60);
    if (!error && signedData?.signedUrl) return signedData.signedUrl;
  } catch (error) {
    console.warn('Nao foi possivel gerar signed URL, usando public URL.', error);
  }
  return publicData.publicUrl;
};

const uploadImageDirectlyToSupabase = async ({
  file,
  orderId,
  serviceId,
  fileType,
  description,
}: {
  file: File;
  orderId: string;
  serviceId: string;
  fileType: string;
  description: string;
}) => {
  const objectName = getObjectName(orderId, file.name);
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(objectName, file, { upsert: true, contentType: file.type || undefined });

  if (error) throw error;

  const url = await getSignedOrPublicUrl(objectName);
  return {
    data: {
      name: normalizeFileName(file.name),
      url,
      object_name: objectName,
      bucket: PHOTO_BUCKET,
      order_id: orderId,
      service_id: serviceId,
      file_type: fileType,
      description,
    },
  };
};

const listImagesDirectlyFromSupabase = async (orderId: string) => {
  const { data: files, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .list(orderId, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

  if (error) throw error;

  const mappedFiles = await Promise.all(
    (files || []).map(async (item) => {
      const objectName = getObjectName(orderId, item.name);
      const url = await getSignedOrPublicUrl(objectName);
      return {
        name: item.name,
        url,
        object_name: objectName,
        bucket: PHOTO_BUCKET,
      };
    }),
  );

  return { data: mappedFiles };
};

const ServiceOrderAPI = {
  get: (
    searchValue = '',
    page = 1,
    filter: FilterOption = 'vehicle',
  ): Promise<ServiceOrderResponse> => getServiceOrders(searchValue, page, filter),

  getById: (id: string | number): Promise<ServiceOrder> => getServiceOrderById(id),

  getByCustomerId: (customerId: string | number): Promise<ServiceOrder[]> =>
    getServiceOrdersByCustomerId(customerId),

  put: async (serviceOrder: ServiceOrder) => {
    const savedOrder = await saveServiceOrder(serviceOrder);
    return { data: savedOrder };
  },

  updateStatus: async (
    id: string | number,
    status: STATUS_SERVICE_ORDER,
  ) => {
    const updatedOrder = await updateServiceOrderStatus(id, status);
    return { data: updatedOrder };
  },

  deleteItem: (itemId: string | number) => deleteOrcamentoItem(itemId),

  // Alias legado para manter compatibilidade com código existente.
  delete: (itemId: string | number) => deleteOrcamentoItem(itemId),

  uploadVehicleImage: async ({
    file,
    imageFile,
    order_id,
    orderId,
    service_id,
    serviceId,
    file_type,
    fileType,
    description,
  }: UploadVehicleImagePayload) => {
    const selectedFile = file || imageFile;
    if (!selectedFile) throw new Error('Arquivo de imagem nao informado.');

    const resolvedOrderId = String(order_id || orderId || '');
    const resolvedServiceId = String(service_id || serviceId || resolvedOrderId);
    const resolvedFileType = file_type || fileType || 'new';
    const resolvedDescription = description || selectedFile.name || '';

    const buildFormData = () =>
      buildUploadFormData({
        file: selectedFile,
        orderId: resolvedOrderId,
        serviceId: resolvedServiceId,
        fileType: resolvedFileType,
        description: resolvedDescription,
      });

    try {
      // Endpoint legado de upload do estimate-svc.
      return await estimateService.post('', buildFormData(), {
        timeout: ESTIMATE_REQUEST_TIMEOUT,
      });
    } catch (error) {
      logEstimateRouteFailure('Falha no upload via estimate-svc', '(base)/', error, {
        orderId: resolvedOrderId,
        fileName: selectedFile.name,
      });
      if (!shouldTryAlternativeUploadRoute(error)) throw error;
    }

    try {
      return await estimateService.post('service/photo', buildFormData(), {
        timeout: ESTIMATE_REQUEST_TIMEOUT,
      });
    } catch (error) {
      logEstimateRouteFailure('Falha no upload via estimate-svc', 'service/photo', error, {
        orderId: resolvedOrderId,
        fileName: selectedFile.name,
      });
      if (!shouldTryAlternativeUploadRoute(error)) throw error;
    }

    return uploadImageDirectlyToSupabase({
      file: selectedFile,
      orderId: resolvedOrderId,
      serviceId: resolvedServiceId,
      fileType: resolvedFileType,
      description: resolvedDescription,
    });
  },

  getImages: async (orderId: string) => {
    if (!orderId) return { data: [] };

    try {
      return await estimateService.get(`${orderId}/service/photo`, {
        timeout: ESTIMATE_REQUEST_TIMEOUT,
      });
    } catch (error) {
      logEstimateRouteFailure('Falha ao listar imagens via estimate-svc', `${orderId}/service/photo`, error, { orderId });
      if (!shouldTryAlternativeUploadRoute(error)) throw error;
    }

    try {
      return await estimateService.get(`service/photo/${orderId}`, {
        timeout: ESTIMATE_REQUEST_TIMEOUT,
      });
    } catch (error) {
      logEstimateRouteFailure('Falha ao listar imagens via estimate-svc', `service/photo/${orderId}`, error, { orderId });
      if (!shouldTryAlternativeUploadRoute(error)) throw error;
    }

    try {
      return await estimateService.get('service/photo', {
        timeout: ESTIMATE_REQUEST_TIMEOUT,
        params: { order_id: orderId },
      });
    } catch (error) {
      logEstimateRouteFailure('Falha ao listar imagens via estimate-svc', 'service/photo?order_id=', error, { orderId });
      if (!shouldTryAlternativeUploadRoute(error)) throw error;
    }

    try {
      return await listImagesDirectlyFromSupabase(orderId);
    } catch (error) {
      console.error('Falha ao listar imagens no estimate-svc e no Supabase Storage.', error);
      return { data: [] };
    }
  },
};

export default ServiceOrderAPI;
