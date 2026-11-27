-- 相片專案（獨立 Supabase organization，只放相片檔案）：建立公開 bucket xc-photos
-- 在「相片專案」執行，不是主專案（計時）。可重複執行
--   * 公開讀取：/storage/v1/object/public/xc-photos/<event>/<uuid>.webp（檔名隨機 UUID，不能列出檔案）
--   * 不設任何 storage.objects 政策：公眾、登入用戶都不能上載、列出或刪除；
--     上載只能用 Edge Function xc-photo-store 簽發的上載網址，刪除亦經該函式（核對主專案管理員身分）
--   * 大圖長邊 1280px（約 220KB）＋縮圖 400px：3,000 張約 0.7GB，免費額度 1GB 內
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('xc-photos', 'xc-photos', true, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
