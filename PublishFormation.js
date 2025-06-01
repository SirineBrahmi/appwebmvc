import React from 'react';
import { useParams } from 'react-router-dom';

const PublishFormation = () => {
  const { formationId } = useParams();
  return <div>Publier la formation ID: {formationId}</div>;
};

export default PublishFormation;