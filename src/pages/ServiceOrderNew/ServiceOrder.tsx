import { Check, File, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { FormProvider, useForm } from 'react-hook-form';
import { DEFAULT_CUSTOMER_VALUE } from '@/components/FormSheet/Customer/schema';
import { DEFAULT_VEHICLE_VALUES } from '@/components/FormSheet/Vehicle/schema';
import Textarea from '@/components/ui/textarea';
import { useLocation, useParams } from 'react-router-dom';
import FileSelect from '@/components/ui/fileSelect';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ServiceOrderAPI from '@/data/api/ServiceOrderAPI';

const DEFAULT_FORM_VALUES = {
  uuid: undefined,
  service_order_items: [],
  customer: DEFAULT_CUSTOMER_VALUE,
  vehicle: DEFAULT_VEHICLE_VALUES,
  status: STATUS_SERVICE_ORDER.EM_ABERTO,
  startAt: '',
  endAt: '',
  note: '',
};

function ServiceOrderPage() {
  const { uuid } = useParams();
  const location = useLocation();
  const [pdfData, setPdfData] = useState<ServiceOrder>();

  const pdfFileName = `${pdfData?.vehicle?.brand}_${pdfData?.vehicle?.model}_${pdfData?.customer?.name}`;

  const methods = useForm<ServiceOrder>({ defaultValues: DEFAULT_FORM_VALUES });
  const queryClient = useQueryClient();

  const { data: serviceImages } = useQuery({
    queryKey: ['service-images', uuid],
    queryFn: () => ServiceOrderAPI.getImages(uuid || ''),
    refetchOnMount: true,
    staleTime: 0,
  });

  useEffect(() => {
    if (uuid) {
      const editingServiceOrder: ServiceOrder = location?.state?.service_order;
      Object.entries(editingServiceOrder).forEach(([key, value]) => {
        if (['startAt', 'endAt'].includes(key)) {
          return methods.setValue(key as keyof ServiceOrder, String(value).substring(0, 10));
        }
        methods.setValue(key as keyof ServiceOrder, value);
      });
      ServiceOrderAPI.getImages(uuid);
    } else if (location.pathname === '/service-order/new') {
      methods.reset();
    }
  }, [uuid]);

  const serviceOrderItems = methods.watch('service_order_items');

  const handleOnAddItem = async (newItem: ServiceOrderItem) => {
    methods.setValue('service_order_items', [newItem, ...serviceOrderItems]);
  };

  const handleChangeItem = (changedItem: ServiceOrderItem) => {
    const index = serviceOrderItems.findIndex((item) => item.uuid === changedItem.uuid);
    let updatedServiceOrderItems = serviceOrderItems;
    updatedServiceOrderItems[index] = changedItem;
    methods.setValue('service_order_items', updatedServiceOrderItems);
  };

  const handleOnRemoveItem = (deletedItem: ServiceOrderItem) => {
    //Checar se já foi salvo ou nao para evitar requisiçoes desnecessárias.
    ServiceOrderAPI.delete(deletedItem.uuid).then(() => {
      methods.setValue(
        'service_order_items',
        serviceOrderItems.filter((item) => item.uuid !== deletedItem.uuid) || [],
      );
    });
  };

  const handleOnError = (e: any) => {
    console.error(e);
    toast.message('Erro ao salvar', { icon: <X /> });
  };

  const handleOnSave = (serviceOrder: ServiceOrder) => putServiceOrder(serviceOrder);

  const invalidateSearchQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['get_service_orders'] });
    queryClient.invalidateQueries({ queryKey: ['get_customers'] });
    queryClient.invalidateQueries({ queryKey: ['get_all_vehicles'] });
  };

  const { mutate: putServiceOrder, isPending } = useMutation({
    mutationKey: ['put-service-order'],
    mutationFn: async (data: ServiceOrder) => (await ServiceOrderAPI.put(data)).data,
    onError: (e) => handleOnError(e),
    onSuccess: (response) => {
      methods.setValue('customer', response.customer);
      methods.setValue('vehicle', response.vehicle);
      toast.message('Salvo com sucesso!', { icon: <Check /> });
      invalidateSearchQueries();
    },
  });

  return (
    <>
      <FormProvider {...methods}>
        <div className="flex-1 flex flex-col gap-4 h-screen">
          <header className="flex items-center gap-4 py-4">
            <div className="flex flex-1">
              <h1 className="text-2xl font-bold">{uuid ? `Editar Orçamento` : 'Novo orçamento'}</h1>
            </div>
            <div className="flex gap-4 items-center">
              <Input type="date" {...methods.register('startAt')} />
              <p>até</p>
              <Input type="date" {...methods.register('endAt')} />
            </div>
            <StatusDropDown
              value={methods.watch('status', STATUS_SERVICE_ORDER.EM_ABERTO)}
              title="Situação atual"
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
              <form
                onSubmit={methods.handleSubmit(handleOnSave)}
                className="flex flex-col h-full  gap-4">
                <Card className="px-4 rounded-3xl">
                  <CustomerForm isPending={false} />
                </Card>
                <Card className="px-4 rounded-3xl">
                  <VehicleForm isPending={false} />
                </Card>
                <Card className="flex flex-1 flex-col p-4 rounded-3xl gap-1">
                  <Textarea
                    className="flex-1"
                    label="Anotações"
                    {...methods.register('note')}
                    placeholder="Ex: Avarias, acordos com o cliente..."
                  />
                </Card>
              </form>
            </section>
            <p className="text-md font-bold pl-4">Imagens do Veículo</p>
            <Card className="p-4 rounded-3xl">
              <FileSelect
                label="Imagens"
                files={serviceImages?.data}
                onChange={(files) =>
                  ServiceOrderAPI.uploadVehicleImage({
                    imageFile: files[0],
                    orderId: uuid,
                    description: '',
                  })
                }
              />
              {/* <code>{JSON.stringify(serviceImages)}</code> */}
            </Card>
          </div>
          <footer
            className="flex justify-end gap-4 py-4 sticky bottom-0"
            onMouseEnter={() => setPdfData(methods.getValues())}>
            <Modal
              trigger={
                <Button
                  disabled={serviceOrderItems.length <= 0}
                  onClick={() => setPdfData(methods.getValues())}
                  variant="outline">
                  <File size={18} />
                  PDF
                </Button>
              }
              title="Orçamento"
              subtitle="Envie ou imprima para seu cliente"
              className="min-h-[calc(100vh-180px)]"
              async={true}>
              <PDFViewer showToolbar={true} className="w-full min-h-[calc(100vh-180px)]">
                <ServiceOrderPDF data={pdfData} filename={pdfFileName} />
              </PDFViewer>
            </Modal>
            <PDFDownloadLink fileName={pdfFileName} document={<ServiceOrderPDF data={pdfData} />}>
              <Button variant={'outline'} disabled={serviceOrderItems.length <= 0} type="button">
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
    </>
  );
}

export default ServiceOrderPage;
