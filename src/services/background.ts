import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/** 背景图落盘后的统一文件名前缀（不含扩展名）。 */
const BACKGROUND_FILE_BASE = 'custom-background';

/**
 * 从相册选择一张图片，复制到应用文档目录（跨重启持久化），返回目标文件的 file:// URI。
 * 返回 null 表示用户取消选择。仅 iOS/Android 支持；web 上不落盘，调用方需自行兜底。
 */
export async function pickBackgroundImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    allowsEditing: false,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  const ext = extensionOf(asset);
  // 先清理旧图，避免文档目录堆积残留。
  deleteStoredBackgroundFiles();

  // 文件名必须每次唯一：若沿用固定名（如 custom-background.jpg），换图后 URI 不变，
  // React 不会重渲染、expo-image 也会按 URI 命中缓存，导致旧图仍被显示。
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const source = new File(asset.uri);
  const target = new File(Paths.document, `${BACKGROUND_FILE_BASE}-${unique}.${ext}`);
  await source.copy(target, { overwrite: true });
  return target.uri;
}

/** 删除文档目录中所有已保存的背景图文件（换图或移除时调用）。 */
export function clearBackgroundImage(): void {
  if (Platform.OS === 'web') return;
  deleteStoredBackgroundFiles();
}

/** 遍历文档目录，删除以 BACKGROUND_FILE_BASE 开头的文件。 */
function deleteStoredBackgroundFiles(): void {
  for (const entry of Paths.document.list()) {
    if (entry instanceof File && entry.name.startsWith(BACKGROUND_FILE_BASE)) {
      entry.delete();
    }
  }
}

/** 由所选图片推导扩展名：优先 mimeType，其次文件名后缀，最后回退 jpg。 */
function extensionOf(asset: ImagePicker.ImagePickerAsset): string {
  const fromMime = asset.mimeType?.split('/')[1]?.toLowerCase();
  if (fromMime && /^[a-z0-9]+$/i.test(fromMime)) {
    return fromMime === 'jpeg' ? 'jpg' : fromMime;
  }
  const fromName = asset.fileName?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (fromName) return fromName;
  return 'jpg';
}
