import { ArrowLeft, Check, File, Save, Search, X } from 'lucide-react';
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
import { Costumer, getCostomersAPI } from '@/data/api/CustomersAPI';
import { getVehiclesAPI, Vehicle } from '@/data/api/VehiclesAPI';
import useDebounce from '@/hooks/useDebounce';
import { DEBOUNCE_TIMEOUT } from '@/data/constants/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
const normalizePlate = (plate?: string | null) => String(plate || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
const hasCustomerData = (customer?: ServiceOrder['customer']) =>
  Boolean(customer?.id || customer?.name || customer?.cpf || customer?.phone || customer?.email || customer?.address);
const hasVehicleData = (vehicle?: ServiceOrder['vehicle']) =>
  Boolean(vehicle?.id || vehicle?.plate || vehicle?.brand || vehicle?.model || vehicle?.year);

function ServiceOrderPage() {
  const { uuid } = useParams();
  const location = useLocation();
  const [pdfData, setPdfData] = useState<ServiceOrder>();
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [vehicleSearchInput, setVehicleSearchInput] = useState('');
  const [isCustomerLookupOpen, setIsCustomerLookupOpen] = useState(false);
  const [isVehicleLookupOpen, setIsVehicleLookupOpen] = useState(false);
  const [isCustomerCreateOpen, setIsCustomerCreateOpen] = useState(false);
  const [isVehicleCreateOpen, setIsVehicleCreateOpen] = useState(false);
  const [customerDraftBeforeCreate, setCustomerDraftBeforeCreate] = useState<ServiceOrder['customer'] | null>(null);
  const [vehicleDraftBeforeCreate, setVehicleDraftBeforeCreate] = useState<ServiceOrder['vehicle'] | null>(null);
  const [previousCustomerSelection, setPreviousCustomerSelection] = useState<ServiceOrder['customer'] | null>(null);
  const [previousVehicleSelection, setPreviousVehicleSelection] = useState<ServiceOrder['vehicle'] | null>(null);
  const [customerSearchTerm, debounceCustomerSearch] = useDebounce({ timeout: DEBOUNCE_TIMEOUT });
  const [vehicleSearchTerm, debounceVehicleSearch] = useDebounce({ timeout: DEBOUNCE_TIMEOUT });

  const methods = useForm<ServiceOrder>({ defaultValues: DEFAULT_FORM_VALUES as ServiceOrder });
  const queryClient = useQueryClient();
  const normalizedCustomerSearch = String(customerSearchTerm || '').trim();
  const normalizedVehicleSearch = String(vehicleSearchTerm || '').trim();

  const currentOrderId = String(uuid || methods.watch('id') || methods.watch('uuid') || '');
  const customerSummary = methods.watch('customer');
  const vehicleSummary = methods.watch('vehicle');
  const hasSelectedCustomer = hasCustomerData(customerSummary);
  const hasSelectedVehicle = hasVehicleData(vehicleSummary);

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

  const { data: customerOptions = [], isFetching: isFetchingCustomers } = useQuery({
    queryKey: ['service-order-customer-search', normalizedCustomerSearch],
    queryFn: async () => (await getCostomersAPI(normalizedCustomerSearch, 1)).data,
    enabled: normalizedCustomerSearch.length >= 2,
  });

  const { data: vehicleOptions = [], isFetching: isFetchingVehicles } = useQuery({
    queryKey: ['service-order-vehicle-search', normalizedVehicleSearch],
    queryFn: async () => (await getVehiclesAPI(normalizedVehicleSearch, 1)).data,
    enabled: normalizedVehicleSearch.length >= 2,
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
      setCustomerSearchInput('');
      setVehicleSearchInput('');
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

  const handleSelectCustomer = (customer: Costumer) => {
    setPreviousCustomerSelection(methods.getValues('customer'));
    methods.setValue(
      'customer',
      {
        id: customer.id ? String(customer.id) : undefined,
        name: customer.nome || '',
        cpf: customer.numero_documento || '',
        phone: customer.telefone || '',
        email: customer.email || '',
        address: customer.endereco || '',
      },
      { shouldDirty: true },
    );
    setCustomerSearchInput(customer.nome || '');
    setIsCustomerLookupOpen(false);
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setPreviousVehicleSelection(methods.getValues('vehicle'));
    methods.setValue(
      'vehicle',
      {
        id: vehicle.id ? String(vehicle.id) : undefined,
        plate: normalizePlate(vehicle.placa),
        color: String(vehicle.cor || '').toLowerCase(),
        brand: vehicle.marca || '',
        model: vehicle.modelo || '',
        year: vehicle.ano ? String(vehicle.ano) : '',
        fuel: vehicle.combustivel || '',
        km: vehicle.km || '',
        chassi: vehicle.chassi || '',
      },
      { shouldDirty: true },
    );
    setVehicleSearchInput(vehicle.placa || '');
    setIsVehicleLookupOpen(false);
  };

  const openCustomerCreateModal = () => {
    const currentCustomer = methods.getValues('customer');
    setCustomerDraftBeforeCreate(currentCustomer);
    setPreviousCustomerSelection(currentCustomer);
    methods.setValue('customer', { ...DEFAULT_CUSTOMER_VALUE, id: undefined } as ServiceOrder['customer'], { shouldDirty: true });
    setCustomerSearchInput('');
    debounceCustomerSearch('');
    setIsCustomerLookupOpen(false);
    setIsCustomerCreateOpen(true);
  };

  const openVehicleCreateModal = () => {
    const currentVehicle = methods.getValues('vehicle');
    setVehicleDraftBeforeCreate(currentVehicle);
    setPreviousVehicleSelection(currentVehicle);
    methods.setValue('vehicle', { ...DEFAULT_VEHICLE_VALUES, id: undefined } as ServiceOrder['vehicle'], { shouldDirty: true });
    setVehicleSearchInput('');
    debounceVehicleSearch('');
    setIsVehicleLookupOpen(false);
    setIsVehicleCreateOpen(true);
  };

  const handleCancelCreateCustomer = () => {
    if (customerDraftBeforeCreate) {
      methods.setValue('customer', customerDraftBeforeCreate, { shouldDirty: true });
    }
    setIsCustomerCreateOpen(false);
  };

  const handleCancelCreateVehicle = () => {
    if (vehicleDraftBeforeCreate) {
      methods.setValue('vehicle', vehicleDraftBeforeCreate, { shouldDirty: true });
    }
    setIsVehicleCreateOpen(false);
  };

  const handleRestorePreviousCustomer = () => {
    if (!previousCustomerSelection) return;
    const currentCustomer = methods.getValues('customer');
    methods.setValue('customer', previousCustomerSelection, { shouldDirty: true });
    setPreviousCustomerSelection(currentCustomer);
  };

  const handleRestorePreviousVehicle = () => {
    if (!previousVehicleSelection) return;
    const currentVehicle = methods.getValues('vehicle');
    methods.setValue('vehicle', previousVehicleSelection, { shouldDirty: true });
    setPreviousVehicleSelection(currentVehicle);
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
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCustomerLookupOpen(true)}>
                  <Search size={16} className="mr-2" />
                  Pesquisar cliente
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsVehicleLookupOpen(true)}>
                  <Search size={16} className="mr-2" />
                  Pesquisar veículos
                </Button>
              </div>

              <Card
                className={`rounded-3xl p-4 h-[140px] overflow-hidden ${
                  hasSelectedCustomer ? 'bg-white' : 'border-zinc-300 bg-zinc-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Cliente</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    disabled={!previousCustomerSelection}
                    onClick={handleRestorePreviousCustomer}
                    aria-label="Voltar para cliente anterior"
                    title="Voltar selecao"
                  >
                    <ArrowLeft size={14} />
                  </Button>
                </div>
                {hasSelectedCustomer ? (
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <p className="truncate">{customerSummary?.name || 'Sem nome'}</p>
                    <p className="truncate">{customerSummary?.phone || 'Sem telefone'}</p>
                    <p className="truncate">{customerSummary?.email || customerSummary?.cpf || 'Sem contato extra'}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Nenhum cliente selecionado.</p>
                )}
              </Card>

              <Card
                className={`rounded-3xl p-4 h-[140px] overflow-hidden ${
                  hasSelectedVehicle ? 'bg-white' : 'border-zinc-300 bg-zinc-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Veículos</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    disabled={!previousVehicleSelection}
                    onClick={handleRestorePreviousVehicle}
                    aria-label="Voltar para veículo anterior"
                    title="Voltar selecao"
                  >
                    <ArrowLeft size={14} />
                  </Button>
                </div>
                {hasSelectedVehicle ? (
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <p className="truncate">{normalizePlate(vehicleSummary?.plate) || 'Placa nao informada'}</p>
                    <p className="truncate">{[vehicleSummary?.brand, vehicleSummary?.model].filter(Boolean).join(' - ') || 'Sem detalhes'}</p>
                    <p className="truncate">{vehicleSummary?.year || 'Ano nao informado'}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Nenhum veículo selecionado.</p>
                )}
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

          <p className="text-md font-bold pl-4">Imagens do Veículo</p>
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

        <Dialog open={isCustomerLookupOpen} onOpenChange={setIsCustomerLookupOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Pesquisar cliente</DialogTitle>
              <DialogDescription>Selecione um cliente existente ou crie um novo cadastro.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-[10px] h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Digite nome, telefone ou documento..."
                  value={customerSearchInput}
                  onChange={(event) => {
                    const value = event.target.value;
                    setCustomerSearchInput(value);
                    debounceCustomerSearch(value);
                  }}
                />
              </div>

              {normalizedCustomerSearch.length < 2 ? (
                <p className="text-sm text-muted-foreground">Digite ao menos 2 caracteres para pesquisar.</p>
              ) : (
                <div className="rounded-md border border-dashed border-violet-300 p-2">
                  {isFetchingCustomers ? (
                    <p className="text-sm text-muted-foreground">Buscando clientes...</p>
                  ) : customerOptions.length > 0 ? (
                    <div className="flex max-h-[280px] flex-col gap-1 overflow-y-auto">
                      {customerOptions.slice(0, 5).map((customer) => (
                        <button
                          key={String(customer.id || customer.nome)}
                          type="button"
                          className="rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                          onClick={() => handleSelectCustomer(customer)}
                        >
                          <p className="font-medium">{customer.nome || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground">
                            {[customer.telefone, customer.numero_documento].filter(Boolean).join(' - ') || 'Sem contato'}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
                  )}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="border-2 border-dashed border-violet-500 text-violet-700 hover:bg-violet-50 hover:text-violet-800"
                onClick={openCustomerCreateModal}
              >
                Novo cliente
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isVehicleLookupOpen} onOpenChange={setIsVehicleLookupOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Pesquisar veículos</DialogTitle>
              <DialogDescription>Selecione um veículo existente ou crie um novo cadastro.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-[10px] h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Digite placa, marca ou modelo..."
                  value={vehicleSearchInput}
                  onChange={(event) => {
                    const value = event.target.value;
                    setVehicleSearchInput(value);
                    debounceVehicleSearch(value);
                  }}
                />
              </div>

              {normalizedVehicleSearch.length < 2 ? (
                <p className="text-sm text-muted-foreground">Digite ao menos 2 caracteres para pesquisar.</p>
              ) : (
                <div className="rounded-md border border-dashed border-violet-300 p-2">
                  {isFetchingVehicles ? (
                    <p className="text-sm text-muted-foreground">Buscando veículos...</p>
                  ) : vehicleOptions.length > 0 ? (
                    <div className="flex max-h-[280px] flex-col gap-1 overflow-y-auto">
                      {vehicleOptions.slice(0, 5).map((vehicle) => (
                        <button
                          key={String(vehicle.id || vehicle.placa)}
                          type="button"
                          className="rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                          onClick={() => handleSelectVehicle(vehicle)}
                        >
                          <p className="font-medium">{normalizePlate(vehicle.placa) || 'Placa nao informada'}</p>
                          <p className="text-xs text-muted-foreground">
                            {[vehicle.marca, vehicle.modelo, vehicle.ano ? String(vehicle.ano) : ''].filter(Boolean).join(' - ') ||
                              'Sem detalhes'}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum veículo encontrado.</p>
                  )}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="border-2 border-dashed border-violet-500 text-violet-700 hover:bg-violet-50 hover:text-violet-800"
                onClick={openVehicleCreateModal}
              >
                Novo veículo
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isCustomerCreateOpen} onOpenChange={setIsCustomerCreateOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo cliente</DialogTitle>
              <DialogDescription>Preencha os mesmos campos de cliente do orcamento.</DialogDescription>
            </DialogHeader>
            <CustomerForm isPending={false} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancelCreateCustomer}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => setIsCustomerCreateOpen(false)}>
                <Save size={18} className="mr-2" />
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isVehicleCreateOpen} onOpenChange={setIsVehicleCreateOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo veículo</DialogTitle>
              <DialogDescription>Preencha os mesmos campos de veículo do orcamento.</DialogDescription>
            </DialogHeader>
            <VehicleForm isPending={false} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancelCreateVehicle}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => setIsVehicleCreateOpen(false)}>
                <Save size={18} className="mr-2" />
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
            title="Orçamento"
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


