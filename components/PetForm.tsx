import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pet, Species } from '../types';
import { savePet, getPetById } from '../db';
import { compressImage } from '../utils/compression';

const PetForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Pet>>({
    species: Species.Dog,
    birthDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (id) {
        const fetchPet = async () => {
            try {
                const pet = await getPetById(id);
                if (pet) {
                    setFormData(pet);
                } else {
                    alert("Pet não encontrado");
                    navigate('/');
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchPet();
    }
  }, [id, navigate]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedData = await compressImage(file, 600, 0.7);
        setFormData({ ...formData, photoData: compressedData });
      } catch (error) {
        console.error("Error compressing image", error);
        alert("Erro ao processar a imagem. Tente uma menor.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.name && formData.species && formData.birthDate) {
      const petToSave: Pet = {
        id: id || crypto.randomUUID(), // Use existing ID if editing
        name: formData.name,
        species: formData.species as Species,
        breed: formData.breed || 'SRD',
        birthDate: formData.birthDate,
        photoData: formData.photoData,
        createdAt: formData.createdAt || Date.now(),
      };

      await savePet(petToSave);
      navigate(id ? `/pet/${id}` : '/');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
          {id ? 'Editar Pet' : 'Novo Pet'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Photo Upload */}
        <div className="flex justify-center mb-4">
          <label className="cursor-pointer group relative">
             <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden hover:bg-slate-50 dark:hover:bg-slate-600 transition group-hover:border-teal-400">
                {formData.photoData ? (
                  <img src={formData.photoData} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 text-xs text-center p-2">Adicionar Foto</span>
                )}
             </div>
             <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome</label>
          <input 
            type="text"
            required
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
            value={formData.name || ''}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Espécie</label>
            <select 
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              value={formData.species}
              onChange={e => setFormData({...formData, species: e.target.value as Species})}
            >
              {Object.values(Species).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Raça</label>
            <input 
              type="text"
              placeholder="Ex: SRD"
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              value={formData.breed || ''}
              onChange={e => setFormData({...formData, breed: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Nascimento (Aprox.)</label>
          <input 
            type="date"
            required
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
            value={formData.birthDate}
            onChange={e => setFormData({...formData, birthDate: e.target.value})}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-teal-600 dark:bg-teal-500 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-teal-700 dark:hover:bg-teal-600 transition active:scale-95 disabled:opacity-70 mt-4"
        >
          {loading ? 'Salvando...' : (id ? 'Atualizar Dados' : 'Cadastrar Pet')}
        </button>
      </form>
    </div>
  );
};

export default PetForm;