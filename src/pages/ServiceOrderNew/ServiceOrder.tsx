import { Check, File, Save, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CustomerForm } from '@/components/FormSheet/Customer';
import { VehicleForm } from '@/components/FormSheet/Vehicle';
import ServiceOrderItems from '../../components/ServiceOrderItems/ServiceOrderItems';
import { ServiceOrder, ServiceOrderItem, STATUS_SERVICE_ORDER } from './types';
import { toast } from 'sonner';
import StatusDropDown from '@/components/BadgeDropDown/BadgeDropDown';
import { SO_STATUS_LIST } from '@/data/constants/utils';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { ServiceOrderPDF } from '@/components/PDF/ServiceOrderPDF';
import { Modal } from '@/components/Modal/Modal';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FormProvider, useForm } from 'react-hook-form';
import { DEFAULT_CUSTOMER_VALUE } from '@/components/FormSheet/Customer/schema';
import { DEFAULT_VEHICLE_VALUES } from '@/components/FormSheet/Vehicle/schema';
import Textarea from '@/components/ui/textarea';
import { useLocation, useParams } from 'react-router-dom';
import FileSelect from '@/components/ui/fileSelect';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ServiceOrderAPI from '@/data/api/ServiceOrderAPI';

const DEFAULT_FORM_VALUES: Partial<ServiceOrder> = {
  id: undefined,
  uuid: undefined,
  service_order_items: [],
  customer: DEFAULT_CUSTOMER_VALUE,
  vehicle: DEFAULT_VEHICLE_VALUES,
  status: STATUS_SERVICE_ORDER.EM_ABERTO,
  startAt: '',
  endAt: '',
  note: '',
  images: [],
  items: [],
  duration_quantity: 0,
  duration_type: 'day',
};

const normalizeDate = (value?: string) => (value ? String(value).substring(0, 10) : '');

const createLocalItemId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function ServiceOrderPage() {
  const { uuid } = useParams();
  const location = useLocation();
  const [pdfData, setPdfData] = useState<ServiceOrder>();

  const methods = useForm<ServiceOrder>({ defaultValues: DEFAULT_FORM_VALUES as ServiceOrder });
  const queryClient = useQueryClient();

  const currentOrderId = String(uuid || methods.watch('id') || methods.watch('uuid') || '');

  const { data: serviceOrderData } = useQuery({
    queryKey: ['service-order', uuid],
    queryFn: () => ServiceOrderAPI.getById(uuid || ''),
    enabled: Boolean(uuid),
    staleTime: 0,
  });

  const { data: serviceImages, isLoading: isLoadingImages } = useQuery({
    queryKey: ['service-images', currentOrderId],
    queryFn: () => ServiceOrderAPI.getImages(currentOrderId),
    enabled: Boolean(currentOrderId),
    refetchOnMount: true,
    staleTime: 0,
  });

  const applyServiceOrderToForm = useCallback(
    (serviceOrder?: ServiceOrder) => {
      if (!serviceOrder) return;

      methods.reset({
        ...DEFAULT_FORM_VALUES,
        ...serviceOrder,
        startAt: normalizeDate(serviceOrder.startAt),
        endAt: normalizeDate(serviceOrder.endAt),
        service_order_items: serviceOrder.service_order_items || [],
      } as ServiceOrder);
    },
    [methods],
  );

  useEffect(() => {
    if (!uuid && location.pathname === '/service-order/new') {
      methods.reset(DEFAULT_FORM_VALUES as ServiceOrder);
    }
  }, [location.pathname, methods, uuid]);

  useEffect(() => {
    if (!uuid || serviceOrderData) return;

    const editingServiceOrder = location?.state?.service_order as ServiceOrder | undefined;
    if (editingServiceOrder) {
      applyServiceOrderToForm(editingServiceOrder);
    }
  }, [applyServiceOrderToForm, location?.state?.service_order, serviceOrderData, uuid]);

  useEffect(() => {
    if (!serviceOrderData) return;
    applyServiceOrderToForm(serviceOrderData);
  }, [applyServiceOrderToForm, serviceOrderData]);

  const serviceOrderItems = methods.watch('service_order_items') || [];

  const handleOnAddItem = async (newItem: ServiceOrderItem) => {
    methods.setValue(
      'service_order_items',
      [{ ...newItem, uuid: newItem.uuid || createLocalItemId() }, ...serviceOrderItems],
      { shouldDirty: true },
    );
  };

  const handleChangeItem = (changedItem: ServiceOrderItem) => {
    const updatedServiceOrderItems = serviceOrderItems.map((item) =>
      item.uuid === changedItem.uuid ? changedItem : item,
    );
    methods.setValue('service_order_items', updatedServiceOrderItems, { shouldDirty: true });
  };

  const handleOnRemoveItem = async (deletedItem: ServiceOrderItem) => {
    const removeLocally = () => {
      methods.setValue(
        'service_order_items',
        serviceOrderItems.filter((item) => item.uuid !== deletedItem.uuid),
        { shouldDirty: true },
      );
    };

    const parsedId = Number(deletedItem.uuid);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      removeLocally();
      return;
    }

    try {
      await ServiceOrderAPI.deleteItem(parsedId);
      removeLocally();
    } catch (error) {
      console.error(error);
      toast.message('Erro ao remover item', { icon: <X /> });
    }
  };

  const handleOnError = (error: unknown) => {
    console.error(error);
    toast.message('Erro ao salvar', { icon: <X /> });
  };

  const invalidateSearchQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['get_service_orders'] });
    queryClient.invalidateQueries({ queryKey: ['get_customers'] });
    queryClient.invalidateQueries({ queryKey: ['get_all_vehicles'] });
  };

  const { mutate: putServiceOrder, isPending } = useMutation({
    mutationKey: ['put-service-order'],
    mutationFn: async (data: ServiceOrder) => (await ServiceOrderAPI.put(data)).data,
    onError: (error) => handleOnError(error),
    onSuccess: (response) => {
      applyServiceOrderToForm(response);
      setPdfData(response);
      toast.message('Salvo com sucesso!', { icon: <Check /> });
      invalidateSearchQueries();
      queryClient.invalidateQueries({ queryKey: ['service-images', String(response.id || response.uuid || '')] });
    },
  });

  const handleOnSave = (serviceOrder: ServiceOrder) => {
    putServiceOrder({
      ...serviceOrder,
      id: serviceOrder.id ?? methods.getValues('id'),
      uuid: serviceOrder.uuid ?? methods.getValues('uuid'),
    });
  };

  const handleOnUploadImage = async (files: File[]) => {
    const file = files?.[0];
    if (!file) return;

    if (!currentOrderId) {
      toast.message('Salve o orcamento antes de enviar imagens.', { icon: <X /> });
      return;
    }

    try {
      await ServiceOrderAPI.uploadVehicleImage({
        imageFile: file,
        orderId: currentOrderId,
        description: '',
      });
      queryClient.invalidateQueries({ queryKey: ['service-images', currentOrderId] });
    } catch (error) {
      console.error(error);
      toast.message('Erro ao enviar imagem', { icon: <X /> });
    }
  };

  const pdfFileName = `${pdfData?.vehicle?.brand}_${pdfData?.vehicle?.model}_${pdfData?.customer?.name}`;

  return (
    <FormProvider {...methods}>
      <div className="flex-1 flex flex-col gap-4 h-screen">
        <header className="flex items-center gap-4 py-4">
          <div className="flex flex-1">
            <h1 className="text-2xl font-bold">{uuid ? 'Editar Orcamento' : 'Novo orcamento'}</h1>
          </div>
          <div className="flex gap-4 items-center">
            <Input type="date" {...methods.register('startAt')} />
            <p>ate</p>
            <Input type="date" {...methods.register('endAt')} />
          </div>
          <StatusDropDown
            value={methods.watch('status', STATUS_SERVICE_ORDER.EM_ABERTO)}
            title="Situacao atual"
            options={SO_STATUS_LIST}
            onChange={(value) => methods.setValue('status', value)}
          />
        </header>

        <div className="overflow-auto scroll-smooth flex flex-col gap-4">
          <section className="flex-1 gap-4 flex">
            <ServiceOrderItems
              data={serviceOrderItems}
              onAddItem={handleOnAddItem}
              onChangeItem={handleChangeItem}
              onRemoveItem={handleOnRemoveItem}
            />

            <form onSubmit={methods.handleSubmit(handleOnSave)} className="flex flex-col h-full gap-4">
              <Card className="px-4 rounded-3xl">
                <CustomerForm isPending={false} />
              </Card>
              <Card className="px-4 rounded-3xl">
                <VehicleForm isPending={false} />
              </Card>
              <Card className="flex flex-1 flex-col p-4 rounded-3xl gap-1">
                <Textarea
                  className="flex-1"
                  label="Anotacoes"
                  {...methods.register('note')}
                  placeholder="Ex: avarias, acordos com o cliente..."
                />
              </Card>
            </form>
          </section>

          <p className="text-md font-bold pl-4">Imagens do Veiculo</p>
          <Card className="p-4 rounded-3xl">
            {isLoadingImages ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <FileSelect label="Imagens" files={serviceImages?.data} onChange={handleOnUploadImage} />
            )}
          </Card>
        </div>

        <footer
          className="flex justify-end gap-4 py-4 sticky bottom-0"
          onMouseEnter={() => setPdfData(methods.getValues())}
        >
          <Modal
            trigger={
              <Button
                disabled={serviceOrderItems.length <= 0}
                onClick={() => setPdfData(methods.getValues())}
                variant="outline"
              >
                <File size={18} />
                PDF
              </Button>
            }
            title="Orcamento"
            subtitle="Envie ou imprima para seu cliente"
            className="min-h-[calc(100vh-180px)]"
            async={true}
          >
            <PDFViewer showToolbar={true} className="w-full min-h-[calc(100vh-180px)]">
              <ServiceOrderPDF data={pdfData} filename={pdfFileName} />
            </PDFViewer>
          </Modal>

          <PDFDownloadLink fileName={pdfFileName} document={<ServiceOrderPDF data={pdfData} />}>
            <Button variant="outline" disabled={serviceOrderItems.length <= 0} type="button">
              <Save size={18} />
              Download
            </Button>
          </PDFDownloadLink>

          <Button type="button" loading={isPending} onClick={methods.handleSubmit(handleOnSave)}>
            <Save size={18} className="mr-2" />
            Salvar
          </Button>
        </footer>
      </div>
    </FormProvider>
  );
}

export default ServiceOrderPage;
