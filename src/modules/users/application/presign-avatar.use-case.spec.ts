import { PresignAvatarUseCase } from './presign-avatar.use-case';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';

describe('PresignAvatarUseCase', () => {
  let useCase: PresignAvatarUseCase;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    storageService = {
      getPresignedUploadUrl: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;
    useCase = new PresignAvatarUseCase(storageService);
  });

  it('returns url and key from storage service', async () => {
    const mockUrl = 'https://example.com/upload';
    const mockKey = 'avatars/user-1/uuid.jpeg';
    storageService.getPresignedUploadUrl.mockResolvedValue({ url: mockUrl, key: mockKey });

    const result = await useCase.execute('user-1', 'image/jpeg');

    expect(result).toEqual({ url: mockUrl, key: mockKey });
  });

  it('extracts extension from mimeType', async () => {
    const mockUrl = 'https://example.com/upload';
    storageService.getPresignedUploadUrl.mockImplementation((key) => {
      return Promise.resolve({ url: mockUrl, key });
    });

    await useCase.execute('user-1', 'image/jpeg');

    const callArgs = storageService.getPresignedUploadUrl.mock.calls[0];
    const keyArg = callArgs[0];
    expect(keyArg).toMatch(/^avatars\/user-1\/[\w-]+\.jpeg$/);
  });

  it('generates key with uuid pattern and correct extension', async () => {
    const mockUrl = 'https://example.com/upload';
    const capturedKeys: string[] = [];
    storageService.getPresignedUploadUrl.mockImplementation((key) => {
      capturedKeys.push(key);
      return Promise.resolve({ url: mockUrl, key });
    });

    await useCase.execute('user-123', 'image/png');

    const key = capturedKeys[0];
    expect(key).toMatch(/^avatars\/user-123\/[\w-]{36}\.png$/);
  });

  it('falls back to jpg extension when no slash in mimeType', async () => {
    const mockUrl = 'https://example.com/upload';
    storageService.getPresignedUploadUrl.mockImplementation((key) => {
      return Promise.resolve({ url: mockUrl, key });
    });

    await useCase.execute('user-1', 'imagepng');

    const callArgs = storageService.getPresignedUploadUrl.mock.calls[0];
    const keyArg = callArgs[0];
    expect(keyArg).toMatch(/\.jpg$/);
  });

  it('falls back to jpg when mimeType is missing extension', async () => {
    const mockUrl = 'https://example.com/upload';
    storageService.getPresignedUploadUrl.mockImplementation((key) => {
      return Promise.resolve({ url: mockUrl, key });
    });

    await useCase.execute('user-1', 'image');

    const callArgs = storageService.getPresignedUploadUrl.mock.calls[0];
    const keyArg = callArgs[0];
    expect(keyArg).toMatch(/\.jpg$/);
  });

  it('passes correct mimeType to storage service', async () => {
    const mockUrl = 'https://example.com/upload';
    storageService.getPresignedUploadUrl.mockResolvedValue({ url: mockUrl, key: 'test-key' });

    await useCase.execute('user-1', 'image/webp');

    const callArgs = storageService.getPresignedUploadUrl.mock.calls[0];
    expect(callArgs[1]).toBe('image/webp');
  });

  it('includes userId in the key path', async () => {
    const mockUrl = 'https://example.com/upload';
    storageService.getPresignedUploadUrl.mockImplementation((key) => {
      return Promise.resolve({ url: mockUrl, key });
    });

    await useCase.execute('custom-user-id', 'image/jpeg');

    const callArgs = storageService.getPresignedUploadUrl.mock.calls[0];
    const keyArg = callArgs[0];
    expect(keyArg).toMatch(/^avatars\/custom-user-id\//);
  });
});
