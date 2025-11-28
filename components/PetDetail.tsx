import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pet, MedicalRecord, RecordType } from '../types';
import { getRecordsByPet, deletePet, saveRecord, getPets, deleteRecord } from '../db';
import { compressImage, fileToBase64 } from '../utils/compression';
import { Link } from 'react-router-dom';
import { jsPDF } from "jspdf";
import { generateICS, downloadICS } from '../utils/ics';

// SVG Line Chart for Weight
const WeightChart: React.FC<{ records: MedicalRecord[] }> = ({ records }) => {
  const data = useMemo(() => {
    return records
      .filter(r => r.type === RecordType.Weight)
      .map(r => ({
        date: new Date(r.date),
        value: parseFloat(r.description.replace(',', '.')) || 0,
        label: r.date
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [records]);

  if (data.length === 0) return <div className="text-center text-slate-400 dark:text-slate-500 py-8">Sem dados de peso registrados.</div>;

  const width = 100;
  const height = 50;
  const padding = 5;

  const maxVal = Math.max(...data.map(d => d.value));
  const minVal = Math.min(...data.map(d => d.value));
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - ((d.value - minVal) / range) * (height - 2 * padding);
    return { x, y, val: d.value, date: d.label };
  });

  const pathD = points.length > 1 
    ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` 
    : `M ${points[0].x},${points[0].y} L ${points[0].x + 1},${points[0].y}`;

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm mb-4">
      <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Evolução do Peso (kg)</h3>
      <div className="relative w-full aspect-[2/1]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <line x1={padding} y1={padding} x2={width-padding} y2={padding} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2" className="dark:stroke-slate-600" />
          <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2" className="dark:stroke-slate-600" />
          
          <path d={pathD} fill="none" stroke="#0d9488" strokeWidth="1" />
          
          {points.length > 1 && (
             <path d={`${pathD} L ${points[points.length-1].x},${height-padding} L ${points[0].x},${height-padding} Z`} fill="#0d9488" fillOpacity="0.1" stroke="none" />
          )}

          {points.map((p, i) => (
            <g key={i} className="group">
              <circle cx={p.x} cy={p.y} r="1.5" className="fill-white dark:fill-slate-800 stroke-teal-600" strokeWidth="1" />
              <text x={p.x} y={p.y - 3} fontSize="3" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 font-bold">
                {p.val}kg
              </text>
              <text x={p.x} y={height} fontSize="2" textAnchor="middle" className="fill-slate-400 dark:fill-slate-500" dy="2">
                {new Date(p.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

const PetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pet, setPet] = useState<Pet | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'vaccines' | 'weight' | 'add'>('history');
  
  // Form/Edit State
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [newRecord, setNewRecord] = useState<Partial<MedicalRecord>>({
    type: RecordType.Vaccine,
    date: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
    attachmentData: '',
    attachmentType: ''
  });
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const allPets = await getPets();
      const foundPet = allPets.find(p => p.id === id);
      if (foundPet) {
        setPet(foundPet);
        const petRecords = await getRecordsByPet(id);
        setRecords(petRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeletePet = async () => {
    if (window.confirm("ATENÇÃO: Isso excluirá o pet e TODOS os seus registros permanentemente. Continuar?")) {
      if (id) {
        await deletePet(id);
        navigate('/');
      }
    }
  };

  const generatePDF = () => {
    if (!pet) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(13, 148, 136); // Teal Color
    doc.text("Prontuário Médico Veterinário", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Gerado via App PetLife", pageWidth / 2, yPos, { align: "center" });
    yPos += 20;

    // Pet Info Box
    doc.setDrawColor(200);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, yPos - 5, pageWidth - 28, 35, 'FD');

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(pet.name, 20, yPos + 5);

    doc.setFontSize(12);
    doc.text(`Espécie: ${pet.species}`, 20, yPos + 15);
    doc.text(`Raça: ${pet.breed}`, 20, yPos + 22);
    doc.text(`Nascimento: ${new Date(pet.birthDate).toLocaleDateString()}`, 110, yPos + 15);
    doc.text(`ID: ${pet.id.slice(0, 8)}`, 110, yPos + 22);

    yPos += 45;

    // Records
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Histórico Clínico", 14, yPos);
    doc.line(14, yPos + 2, pageWidth - 14, yPos + 2);
    yPos += 15;

    records.forEach((rec) => {
        // Check page break
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }

        const dateStr = new Date(rec.date).toLocaleDateString();
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`${dateStr} - ${rec.type}`, 14, yPos);
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text(rec.title, 14, yPos + 5);
        doc.setFont(undefined, 'normal');

        if (rec.description) {
            doc.setFontSize(10);
            doc.setTextColor(60);
            const splitDesc = doc.splitTextToSize(rec.description, pageWidth - 30);
            doc.text(splitDesc, 14, yPos + 10);
            yPos += (splitDesc.length * 4) + 15;
        } else {
            yPos += 15;
        }

        // Separator
        doc.setDrawColor(240);
        doc.line(14, yPos - 5, pageWidth - 14, yPos - 5);
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 20, 290, { align: 'right' });
    }

    doc.save(`Prontuario_${pet.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleDeleteRecord = async (recordId: string) => {
      if(window.confirm("Excluir este registro?")) {
          await deleteRecord(recordId);
          loadData();
      }
  }

  const handleEditRecord = (record: MedicalRecord) => {
      setNewRecord({
          ...record
      });
      setEditingRecordId(record.id);
      setActiveTab('add');
  };

  const handleCancelEdit = () => {
      setEditingRecordId(null);
      setNewRecord({
        type: RecordType.Vaccine,
        date: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        nextDueDate: '',
        attachmentData: '',
        attachmentType: ''
      });
      setActiveTab('history');
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingFile(true);
      try {
        let data: string;
        const type = file.type;

        if (type.startsWith('image/')) {
          data = await compressImage(file, 1024, 0.6);
        } else {
          data = await fileToBase64(file);
        }

        setNewRecord({
          ...newRecord,
          attachmentData: data,
          attachmentType: type
        });
      } catch (err) {
        console.error("Error processing file", err);
        alert("Erro ao processar arquivo.");
      } finally {
        setIsProcessingFile(false);
      }
    }
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newRecord.title || !newRecord.date) return;

    const recordToSave: MedicalRecord = {
      id: editingRecordId || crypto.randomUUID(),
      petId: id,
      createdAt: editingRecordId ? (newRecord.createdAt || Date.now()) : Date.now(),
      type: newRecord.type as RecordType,
      date: newRecord.date as string,
      title: newRecord.title as string,
      description: newRecord.description || '',
      nextDueDate: newRecord.nextDueDate,
      attachmentData: newRecord.attachmentData,
      attachmentType: newRecord.attachmentType
    };

    await saveRecord(recordToSave);
    
    // Reset
    setEditingRecordId(null);
    setNewRecord({
      type: RecordType.Vaccine,
      date: new Date().toISOString().split('T')[0],
      title: '',
      description: '',
      nextDueDate: '',
      attachmentData: '',
      attachmentType: ''
    });
    
    if (recordToSave.type === RecordType.Vaccine) setActiveTab('vaccines');
    else if (recordToSave.type === RecordType.Weight) setActiveTab('weight');
    else setActiveTab('history');
    
    loadData();
  };

  const downloadAttachment = (data: string, type: string, title: string) => {
     const link = document.createElement('a');
     link.href = data;
     link.download = `${title.replace(/\s+/g, '_')}_anexo.${type.includes('pdf') ? 'pdf' : 'jpg'}`;
     link.click();
  };

  const handleAddToCalendar = (record: MedicalRecord) => {
      if (!record.nextDueDate || !pet) return;

      const icsContent = generateICS([{
          id: record.id,
          title: `${record.title} - ${pet.name}`,
          description: `Lembrete de ${record.type} para ${pet.name}. ${record.description || ''}`,
          startDate: record.nextDueDate
      }]);

      downloadICS(`${record.title}_${pet.name}`, icsContent);
  };

  const renderRecordItem = (record: MedicalRecord) => (
    <div key={record.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex gap-3 mb-3 relative group">
      <div className={`w-2 h-full rounded-full self-stretch flex-shrink-0 ${
          record.type === RecordType.Vaccine ? 'bg-blue-400' :
          record.type === RecordType.Surgery ? 'bg-red-400' :
          record.type === RecordType.Exam ? 'bg-purple-400' :
          record.type === RecordType.Consultation ? 'bg-teal-400' :
          record.type === RecordType.Weight ? 'bg-green-400' :
          'bg-slate-400'
      }`}></div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{record.type}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(record.date).toLocaleDateString()}</span>
        </div>
        <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate pr-16">{record.title}</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{record.description}</p>
        
        <div className="mt-3 flex gap-2 flex-wrap items-center">
          {record.nextDueDate && (
            <div className="flex gap-2">
                <div className="text-xs bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-1 rounded border border-orange-100 dark:border-orange-800 font-medium">
                📅 Próx: {new Date(record.nextDueDate).toLocaleDateString()}
                </div>
                <button 
                    onClick={() => handleAddToCalendar(record)}
                    className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                    title="Adicionar à Agenda"
                >
                    🔔 Add Agenda
                </button>
            </div>
          )}
          {record.attachmentData && (
            <button 
              onClick={() => downloadAttachment(record.attachmentData!, record.attachmentType || 'image/jpeg', record.title)}
              className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800 flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
            >
                {record.attachmentType?.includes('pdf') ? '📄 PDF' : '📎 Imagem'}
            </button>
          )}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="absolute top-3 right-3 flex gap-2">
        <button onClick={() => handleEditRecord(record)} className="text-slate-300 hover:text-teal-500 transition" title="Editar">
            ✏️
        </button>
        <button onClick={() => handleDeleteRecord(record.id)} className="text-slate-300 hover:text-red-500 transition" title="Excluir">
            🗑️
        </button>
      </div>
    </div>
  );

  if (!pet) return <div className="text-center p-8 dark:text-white">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Header Profile */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center relative">
        <div className="w-24 h-24 rounded-full bg-teal-100 dark:bg-teal-900 flex-shrink-0 overflow-hidden border-4 border-white dark:border-slate-700 shadow-lg mb-3">
           {pet.photoData ? (
            <img src={pet.photoData} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">
              {pet.species === 'Cachorro' ? '🐶' : '🐱'}
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{pet.name}</h1>
        <p className="text-slate-500 dark:text-slate-400">{pet.breed} • {new Date(pet.birthDate).toLocaleDateString()}</p>
        
        {/* Pet Actions */}
        <div className="mt-4 flex gap-2 flex-wrap justify-center">
            <button
                onClick={generatePDF}
                className="px-4 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-full hover:bg-teal-700 transition flex items-center gap-1 shadow-sm"
            >
                📄 PDF Prontuário
            </button>
            <Link 
                to={`/edit-pet/${pet.id}`}
                className="px-4 py-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-700 rounded-full hover:bg-teal-50 dark:hover:bg-teal-900/30 transition"
            >
                Editar
            </Link>
            <button 
                onClick={handleDeletePet}
                className="px-4 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
                Excluir
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200 dark:bg-slate-700 rounded-xl p-1 overflow-x-auto gap-1 no-scrollbar">
        {[
          { id: 'history', label: 'Geral', icon: '📋' },
          { id: 'vaccines', label: 'Vacinas', icon: '💉' },
          { id: 'weight', label: 'Peso', icon: '⚖️' },
          { id: 'add', label: editingRecordId ? 'Editando' : 'Novo', icon: editingRecordId ? '✏️' : '➕' },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center justify-center gap-1
              ${activeTab === tab.id 
                ? 'bg-white dark:bg-slate-600 text-teal-700 dark:text-teal-200 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {records.length === 0 && (
              <div className="text-center text-slate-400 dark:text-slate-500 py-10">
                Nenhum registro médico ainda.
              </div>
            )}
            {records.map(renderRecordItem)}
          </div>
        )}

        {/* VACCINES TAB */}
        {activeTab === 'vaccines' && (
          <div className="space-y-3">
             <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-700 dark:text-slate-200">Carteira de Vacinação</h3>
                <button onClick={() => setActiveTab('add')} className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline">+ Adicionar</button>
             </div>
             {records.filter(r => r.type === RecordType.Vaccine).length === 0 ? (
                <div className="text-center text-slate-400 dark:text-slate-500 py-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  Nenhuma vacina registrada.
                </div>
             ) : (
                records.filter(r => r.type === RecordType.Vaccine).map(renderRecordItem)
             )}
          </div>
        )}

        {/* WEIGHT TAB */}
        {activeTab === 'weight' && (
          <div className="space-y-4">
             <WeightChart records={records} />
             
             <div className="flex justify-between items-center mt-6 mb-2">
                 <h3 className="font-bold text-slate-700 dark:text-slate-200">Histórico de Pesagem</h3>
                 <button onClick={() => {
                     setNewRecord({ ...newRecord, type: RecordType.Weight, title: "Pesagem", description: "" });
                     setActiveTab('add');
                 }} className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline">+ Adicionar Peso</button>
             </div>

             <div className="space-y-2">
                {records.filter(r => r.type === RecordType.Weight).length === 0 ? (
                   <div className="text-center text-slate-400 dark:text-slate-500 py-4">Nenhum peso registrado.</div>
                ) : (
                   records.filter(r => r.type === RecordType.Weight).map(renderRecordItem)
                )}
             </div>
          </div>
        )}

        {/* ADD/EDIT RECORD TAB */}
        {activeTab === 'add' && (
          <form onSubmit={handleSaveRecord} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
            
            {editingRecordId && (
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-teal-600 dark:text-teal-400">Editando Registro</h3>
                    <button type="button" onClick={handleCancelEdit} className="text-xs text-red-500">Cancelar</button>
                </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Registro</label>
              <select 
                value={newRecord.type}
                onChange={e => {
                    const type = e.target.value as RecordType;
                    setNewRecord({
                        ...newRecord, 
                        type,
                        title: type === RecordType.Weight ? 'Pesagem' : newRecord.title
                    })
                }}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              >
                {Object.values(RecordType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                 {newRecord.type === RecordType.Weight ? 'Peso (Ex: 12.5 kg)' : 'Título'}
              </label>
              <input 
                type={newRecord.type === RecordType.Weight ? "text" : "text"}
                required
                placeholder={newRecord.type === RecordType.Weight ? "12.5" : "Ex: Consulta de Rotina, Vacina da Raiva"}
                value={newRecord.type === RecordType.Weight ? newRecord.description : newRecord.title}
                onChange={e => {
                    if (newRecord.type === RecordType.Weight) {
                        setNewRecord({...newRecord, description: e.target.value, title: 'Pesagem'});
                    } else {
                        setNewRecord({...newRecord, title: e.target.value});
                    }
                }}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                <input 
                  type="date"
                  required
                  value={newRecord.date}
                  onChange={e => setNewRecord({...newRecord, date: e.target.value})}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Próxima Data (Opcional)</label>
                <input 
                  type="date"
                  value={newRecord.nextDueDate || ''}
                  onChange={e => setNewRecord({...newRecord, nextDueDate: e.target.value})}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            {newRecord.type !== RecordType.Weight && (
                <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observações</label>
                <textarea 
                    rows={3}
                    value={newRecord.description}
                    onChange={e => setNewRecord({...newRecord, description: e.target.value})}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                ></textarea>
                </div>
            )}

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Anexar Exame/Doc</label>
              <input 
                type="file" 
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 dark:file:bg-teal-900 file:text-teal-700 dark:file:text-teal-200 hover:file:bg-teal-100 dark:hover:file:bg-teal-800"
              />
              {isProcessingFile && <p className="text-xs text-orange-500 mt-1">Processando e compactando arquivo...</p>}
              {newRecord.attachmentData && !isProcessingFile && (
                <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  ✅ Arquivo pronto ({newRecord.attachmentType})
                </div>
              )}
            </div>

            <button type="submit" disabled={isProcessingFile} className="w-full bg-teal-600 dark:bg-teal-500 text-white py-3 rounded-lg font-bold shadow-md hover:bg-teal-700 dark:hover:bg-teal-600 transition disabled:opacity-70">
              {editingRecordId ? 'Atualizar Registro' : 'Salvar Registro'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PetDetail;