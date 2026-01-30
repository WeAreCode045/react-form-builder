
import React, { useState, useCallback } from 'react';
import { 
  Eye, 
  Settings2, 
  Download, 
  Layers,
  Sparkles,
  FileText
} from 'lucide-react';
import { FormSchema, FieldType, FormField, AppState } from './types';
import { INITIAL_SCHEMA } from './constants';
import ComponentLibrary from './components/ComponentLibrary';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import AIGeneratorModal from './components/AIGeneratorModal';
import PDFReaderModal from './components/PDFReaderModal';
import ExportModal from './components/ExportModal';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    schema: INITIAL_SCHEMA,
    selectedFieldId: null,
    isPreview: false,
  });

  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const findAndModify = (fields: FormField[], id: string, modifier: (f: FormField) => FormField | null): FormField[] => {
    return fields.reduce((acc: FormField[], field) => {
      if (field.id === id) {
        const modified = modifier(field);
        if (modified) acc.push(modified);
      } else if (field.children) {
        acc.push({ ...field, children: findAndModify(field.children, id, modifier) });
      } else {
        acc.push(field);
      }
      return acc;
    }, []);
  };

  const addField = useCallback((type: FieldType) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: type === FieldType.SECTION ? 'New Section' : `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      placeholder: type === FieldType.SECTION ? '' : `Enter ${type}...`,
      required: false,
      options: ['select', 'radio', 'checkbox'].includes(type) ? [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' }
      ] : undefined,
      children: type === FieldType.SECTION ? [] : undefined,
      isCollapsed: false
    };

    setState(prev => {
      const { selectedFieldId, schema } = prev;
      
      // If a section is selected, try to add into it
      const addToSection = (fields: FormField[], sectionId: string): FormField[] => {
        return fields.map(f => {
          if (f.id === sectionId && f.type === FieldType.SECTION) {
            return { ...f, children: [...(f.children || []), newField], isCollapsed: false };
          }
          if (f.children) {
            return { ...f, children: addToSection(f.children, sectionId) };
          }
          return f;
        });
      };

      let newFields = [...schema.fields];
      if (selectedFieldId) {
        // Try adding to the selected section or after selected field
        newFields = addToSection(schema.fields, selectedFieldId);
        // If nothing changed, just append to end of top level
        const wasAdded = JSON.stringify(newFields) !== JSON.stringify(schema.fields);
        if (!wasAdded) {
          newFields = [...schema.fields, newField];
        }
      } else {
        newFields = [...schema.fields, newField];
      }

      return {
        ...prev,
        schema: { ...schema, fields: newFields },
        selectedFieldId: newField.id
      };
    });
  }, []);

  const updateField = useCallback((updatedField: FormField) => {
    setState(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: findAndModify(prev.schema.fields, updatedField.id, () => updatedField)
      }
    }));
  }, []);

  const deleteField = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: findAndModify(prev.schema.fields, id, () => null)
      },
      selectedFieldId: prev.selectedFieldId === id ? null : prev.selectedFieldId
    }));
  }, []);

  const duplicateField = useCallback((field: FormField) => {
    const duplicated: FormField = {
      ...field,
      id: `field_${Date.now()}_dup`,
      label: `${field.label} (Copy)`,
      children: field.children ? field.children.map(c => ({ ...c, id: `field_${Date.now()}_${Math.random()}` })) : undefined
    };
    
    setState(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: [...prev.schema.fields, duplicated]
      },
      selectedFieldId: duplicated.id
    }));
  }, []);

  const moveField = useCallback((index: number, direction: 'up' | 'down') => {
    setState(prev => {
      const fields = [...prev.schema.fields];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= fields.length) return prev;
      [fields[index], fields[targetIndex]] = [fields[targetIndex], fields[index]];
      return { ...prev, schema: { ...prev.schema, fields } };
    });
  }, []);

  const findFieldById = (fields: FormField[], id: string | null): FormField | null => {
    if (!id) return null;
    for (const f of fields) {
      if (f.id === id) return f;
      if (f.children) {
        const found = findFieldById(f.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedField = findFieldById(state.schema.fields, state.selectedFieldId);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-40 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-indigo-100 shadow-lg">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">Gemini Form Builder</h1>
            <p className="text-xs text-slate-400 font-medium">Hierarchical Form Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsAIModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100">
            <Sparkles className="w-4 h-4" /> AI Generator
          </button>
          <button onClick={() => setIsPDFModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100">
            <FileText className="w-4 h-4" /> PDF to Form
          </button>
          <div className="w-[1px] h-6 bg-slate-200 mx-1" />
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setState(prev => ({ ...prev, isPreview: false }))} className={`flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${!state.isPreview ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>
              <Settings2 className="w-4 h-4" /> Builder
            </button>
            <button onClick={() => setState(prev => ({ ...prev, isPreview: true }))} className={`flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${state.isPreview ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>
              <Eye className="w-4 h-4" /> Preview
            </button>
          </div>
          <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 ml-2">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        <aside className={`w-72 shrink-0 h-full transition-transform duration-300 ${state.isPreview ? '-translate-x-full' : 'translate-x-0'}`}>
          <ComponentLibrary onAddField={addField} />
        </aside>

        <Canvas 
          schema={state.schema}
          selectedFieldId={state.selectedFieldId}
          isPreview={state.isPreview}
          onSelectField={(id) => setState(prev => ({ ...prev, selectedFieldId: id }))}
          onDeleteField={deleteField}
          onDuplicateField={duplicateField}
          onUpdateSchema={(schema) => setState(prev => ({ ...prev, schema }))}
          onMoveField={moveField}
          onUpdateField={updateField}
        />

        <aside className={`w-80 shrink-0 h-full transition-transform duration-300 ${state.isPreview ? 'translate-x-full' : 'translate-x-0'}`}>
          <PropertiesPanel 
            field={selectedField}
            onUpdate={updateField}
            onDelete={deleteField}
          />
        </aside>
      </main>

      {isAIModalOpen && <AIGeneratorModal onClose={() => setIsAIModalOpen(false)} onGenerated={(newSchema) => setState(prev => ({ ...prev, schema: newSchema }))} />}
      {isPDFModalOpen && <PDFReaderModal onClose={() => setIsPDFModalOpen(false)} onGenerated={(newSchema) => setState(prev => ({ ...prev, schema: newSchema }))} />}
      {isExportModalOpen && <ExportModal schema={state.schema} onClose={() => setIsExportModalOpen(false)} />}
    </div>
  );
};

export default App;
