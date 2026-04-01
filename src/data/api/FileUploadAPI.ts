import { estimateService } from './config';

interface FileUploadAPI {
  uploadImage: () => Promise<{ data: any }>;
}

interface IImageUpload {
  file: File;
  orderId?: string;
  serviceId?: string;
  fileType?: string;
}

const createFileUploadAPI = (httpClient: typeof estimateService) => ({
  uploadImage: ({ file, orderId, fileType = 'new' }: IImageUpload) => {
    const bodyFormData = new FormData();
    bodyFormData.append('file', file);
    bodyFormData.append('orderId', orderId || '');
    bodyFormData.append('fileType', fileType);
    return httpClient.post('', bodyFormData);
  },
});

const FileUploadAPI = createFileUploadAPI(estimateService);
export default FileUploadAPI;
