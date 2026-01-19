export function Footer() {
  return (
    <footer className="bg-gray-900 text-white p-4 text-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center">
        <div className="space-x-4">
          <a href="/impressum" className="hover:underline">
            Impressum / Legal
          </a>
          <span>© 2026 jaime-hyland.com</span>
          <span>MIT License</span>
        </div>
        <button className="mt-2 sm:mt-0 bg-gray-700 px-2 py-1 rounded hover:bg-gray-600">
          Manage Data Collection
        </button>
      </div>
    </footer>
  );
}
