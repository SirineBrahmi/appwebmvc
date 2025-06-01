import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminFormationsView from './AdminFormationsView';
import useAdminFormationsController from '../controllers/AdminFormationsController';

console.log('Loading AdminFormations.js');

const AdminFormations = () => {
  const navigate = useNavigate();
  const controller = useAdminFormationsController();
  const navigateToPublish = (formationId) => navigate(`/admin/publish/${formationId}`);
  return <AdminFormationsView controller={{ ...controller, navigateToPublish }} />;
};

export default AdminFormations;