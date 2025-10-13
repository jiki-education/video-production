export default function PipelineFooter() {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Run Pipeline</button>
        <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">Validate</button>
      </div>
      <div className="text-sm text-gray-600">
        Status: <span className="text-green-600 font-medium">Ready</span>
      </div>
    </footer>
  );
}
