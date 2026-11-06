import { ArrowUpRight, Check, Download, ExternalLink, FileArchive, FolderOpen, Globe2, Laptop, PackageOpen, Terminal } from 'lucide-react';
import { Modal } from './UI';

const REPOSITORY = 'https://github.com/romanata10/the-street-view-game-by-ai-';
const SOURCE_ZIP = `${REPOSITORY}/archive/refs/heads/main.zip`;
const PRODUCTION_TAR = `${REPOSITORY}/releases/download/v1.0.0/geosvoi-1.0.0-production.tar.gz`;
const RELEASES = `${REPOSITORY}/releases/latest`;
const GUIDE = `${REPOSITORY}/blob/main/docs/DOWNLOAD.ru.md`;

export default function DownloadModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} className="download-modal" label="Скачать ГЕОСВОИ">
      <span className="eyebrow"><Download size={14} /> ЦЕНТР ЗАГРУЗОК</span>
      <h2>Скачать ГЕОСВОИ</h2>
      <p className="download-intro">Это браузерная игра, поэтому установочный EXE или APK не нужен. Скачай архив, распакуй и запусти локальный сервер — он одновременно отдаёт сайт и соединяет игроков.</p>

      <div className="download-options">
        <a className="download-option featured" href={SOURCE_ZIP} target="_blank" rel="noreferrer">
          <span className="download-option-icon"><FileArchive size={24} /></span>
          <span><small>ПОСЛЕДНЯЯ ВЕРСИЯ ИСХОДНИКОВ</small><b>Скачать ZIP</b><em>Весь проект · удобно для Windows, macOS и Linux</em></span>
          <Download size={19} />
        </a>
        <a className="download-option" href={PRODUCTION_TAR} target="_blank" rel="noreferrer">
          <span className="download-option-icon"><PackageOpen size={23} /></span>
          <span><small>ГОТОВАЯ PRODUCTION-СБОРКА · v1.0.0</small><b>Скачать TAR.GZ</b><em>Уже собранный клиент, сервер и документация</em></span>
          <Download size={18} />
        </a>
        <a className="download-option compact" href={RELEASES} target="_blank" rel="noreferrer">
          <span className="download-option-icon"><FolderOpen size={21} /></span>
          <span><b>Все релизы и другие архивы</b><em>ZIP, TAR.GZ, исходники и SHA-256</em></span>
          <ArrowUpRight size={18} />
        </a>
      </div>

      <div className="download-format-note"><Check size={15} /><span><b>RAR не нужен.</b> ZIP открывается стандартными средствами системы. Для TAR.GZ подойдут 7-Zip, WinRAR или команда <code>tar</code>.</span></div>

      <section className="download-tutorial">
        <h3><Laptop size={18} /> Как установить и запустить ZIP</h3>
        <ol>
          <li><span>1</span><div><b>Скачай и распакуй ZIP</b><p>Windows: «Извлечь всё…». macOS: двойной клик. Linux: <code>unzip main.zip</code>.</p></div></li>
          <li><span>2</span><div><b>Установи Node.js 20.19 или новее</b><p><a href="https://nodejs.org/en/download" target="_blank" rel="noreferrer">Скачать Node.js <ExternalLink size={11} /></a>. Рекомендуется версия 22 LTS.</p></div></li>
          <li><span>3</span><div><b>Открой терминал в папке проекта</b><p>Выполни две команды:</p><pre><code>npm ci{`\n`}npm run dev</code></pre></div></li>
          <li><span>4</span><div><b>Открой игру</b><p>Перейди на <code>http://localhost:3000</code>. Остановка сервера — <code>Ctrl + C</code>.</p></div></li>
        </ol>
      </section>

      <details className="production-instructions">
        <summary><Terminal size={15} /> Запуск готового TAR.GZ без сборки</summary>
        <pre><code>tar -xzf geosvoi-1.0.0-production.tar.gz{`\n`}cd geosvoi-1.0.0{`\n`}npm ci --omit=dev{`\n`}npm start</code></pre>
      </details>

      <div className="download-friend-note"><Globe2 size={18} /><p><b>Как играть с другом после установки?</b> Откройте один общий адрес сервера. <code>localhost</code> работает только на твоём компьютере; для игры через интернет используй публичный сервер или инструкцию Deployment.</p></div>
      <a className="download-full-guide" href={GUIDE} target="_blank" rel="noreferrer">Полная инструкция и решение проблем <ArrowUpRight size={15} /></a>
    </Modal>
  );
}
