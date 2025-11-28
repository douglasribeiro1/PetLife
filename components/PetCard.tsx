import React from 'react';
import { Pet } from '../types';
import { Link } from 'react-router-dom';

interface PetCardProps {
  pet: Pet;
}

const PetCard: React.FC<PetCardProps> = ({ pet }) => {
  return (
    <Link to={`/pet/${pet.id}`} className="block">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-4 transition-all active:scale-95 hover:shadow-md">
        <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900/50 flex-shrink-0 overflow-hidden border-2 border-teal-500 dark:border-teal-600">
          {pet.photoData ? (
            <img src={pet.photoData} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-teal-600 dark:text-teal-400 text-2xl">
              {pet.species === 'Cachorro' ? '🐶' : pet.species === 'Gato' ? '🐱' : '🐾'}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{pet.name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{pet.species} • {pet.breed}</p>
        </div>
        <div className="ml-auto text-slate-300 dark:text-slate-600">
          👉
        </div>
      </div>
    </Link>
  );
};

export default PetCard;