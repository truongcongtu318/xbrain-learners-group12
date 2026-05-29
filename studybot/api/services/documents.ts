import type { Providers } from '../types';

export class DocumentService {
  constructor(private readonly providers: Providers) {}

  createUploadSession(userIdHeaders: Headers, filename: string, contentType: string) {
    return this.providers.auth.resolveUser(userIdHeaders).then((user) => this.providers.documents.createUploadSession(user, filename, contentType));
  }

  acceptMockUpload(userIdHeaders: Headers, documentId: string) {
    return this.providers.auth.resolveUser(userIdHeaders).then((user) => this.providers.documents.acceptMockUpload(user, documentId));
  }

  listDocuments(userIdHeaders: Headers) {
    return this.providers.auth.resolveUser(userIdHeaders).then((user) => this.providers.documents.listDocuments(user));
  }

  getDocument(userIdHeaders: Headers, documentId: string) {
    return this.providers.auth.resolveUser(userIdHeaders).then((user) => this.providers.documents.getDocument(user, documentId));
  }
}
