import { Sidebar } from '@/components/sidebar';
import { EditModeToggle } from '@/components/edit-mode-toggle';
import { PdfExportButton } from '@/components/pdf-export-button';
import { ComparisonTables } from '@/components/comparison-tables';

export default function ComparisonPage() {
  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 pt-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col items-start justify-between md:flex-row md:items-center">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Comparison & Alignment
              </h1>
              <p className="mt-2 text-lg text-gray-600 font-medium">
                Compare agent targets with UM forecasts and adjust alignment per unit.
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
              <EditModeToggle />
              <PdfExportButton />
            </div>
          </div>

          <ComparisonTables />
        </div>
      </main>
    </div>
  );
}

