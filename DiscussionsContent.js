import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { ref, onValue, set, push, get, query, orderByChild, equalTo, serverTimestamp, remove } from 'firebase/database';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AgoraRTC from 'agora-rtc-sdk-ng';
import EmojiPicker from 'emoji-picker-react';

// Styled Components
const ChatContainer = styled.div`
  display: flex;
  height: 80vh;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
`;

const ChatSidebar = styled.div`
  width: 320px;
  background: linear-gradient(135deg, #1e3b70 0%, #2c5282 100%);
  color: white;
  overflow-y: auto;
  border-right: 2px solid #2d4373;
  scrollbar-width: thin;
  scrollbar-color: #2d4373 #1e3b70;
`;

const ChatItem = styled.div`
  padding: 15px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  background: ${props => props.selected ? 'rgba(39, 77, 138, 0.8)' : 'transparent'};
  transition: all 0.3s ease;
  border-left: 4px solid ${props => props.selected ? '#f6e05e' : 'transparent'};
  &:hover {
    background: rgba(39, 77, 138, 0.6);
  }
`;

const ChatName = styled.span`
  font-size: 1.1rem;
  font-weight: 500;
  flex: 1;
`;

const OnlineIndicator = styled.span`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.online ? '#34d058' : '#a0aec0'};
  border: 2px solid #fff;
`;

const GroupActions = styled.button`
  background: none;
  border: none;
  color: #f6e05e;
  cursor: pointer;
  padding: 5px;
  font-size: 16px;
  &:hover {
    color: #ffffff;
  }
`;

const ChatWindow = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f7fafc;
`;

const ChatHeader = styled.div`
  padding: 20px;
  background: linear-gradient(90deg, #2d3748 0%, #4a5568 100%);
  color: white;
  font-size: 1.3rem;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CallButtons = styled.div`
  display: flex;
  gap: 15px;
`;

const CallButton = styled.button`
  padding: 10px 16px;
  background: ${props => props.video ? '#ed8936' : '#48bb78'};
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  &:hover {
    background: ${props => props.video ? '#dd6b20' : '#38a169'};
    transform: translateY(-1px);
  }
  &:disabled {
    background: #a0aec0;
    cursor: not-allowed;
  }
`;

const MessagesArea = styled.div`
  flex: 1;
  padding: 25px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #a0aec0 #f7fafc;
`;

const Message = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.isCurrentUser ? 'flex-end' : 'flex-start'};
  margin-bottom: 20px;
  position: relative;
  &:hover .message-actions {
    display: ${props => props.isCurrentUser ? 'flex' : 'none'};
  }
`;

const MessageBubble = styled.div`
  max-width: 70%;
  padding: 12px 18px;
  background: ${props => props.isCurrentUser ? '#4299e1' : '#edf2f7'};
  color: ${props => props.isCurrentUser ? 'white' : '#2d3748'};
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 1rem;
  line-height: 1.5;
`;

const MessageTime = styled.span`
  font-size: 0.75rem;
  color: #718096;
  margin-top: 6px;
`;

const MessageActions = styled.div`
  display: none;
  position: absolute;
  top: -25px;
  right: 12px;
  gap: 8px;
`;

const ActionButton = styled.button`
  padding: 6px 12px;
  background: #4a5568;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  &:hover {
    background: #2d3748;
  }
`;

const InputArea = styled.div`
  display: flex;
  padding: 20px;
  border-top: 2px solid #e2e8f0;
  background: #fff;
  align-items: center;
  gap: 10px;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  background: #f7fafc;
  color: #2d3748;
  &:focus {
    outline: none;
    border-color: #f6e05e;
    box-shadow: 0 0 0 3px rgba(246, 224, 94, 0.3);
  }
`;

const SendButton = styled.button`
  padding: 12px 24px;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
  &:hover {
    background: #2b6cb0;
    transform: translateY(-1px);
  }
  &:disabled {
    background: #a0aec0;
    cursor: not-allowed;
  }
`;

const EmojiButton = styled.button`
  padding: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  &:hover {
    transform: scale(1.1);
  }
`;

const EmojiPickerContainer = styled.div`
  position: absolute;
  bottom: 70px;
  right: 20px;
  z-index: 1000;
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 25px;
  width: 450px;
  max-width: 95%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.h2`
  color: #2d3748;
  margin: 0 0 25px;
  font-size: 1.5rem;
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 12px;
  margin-bottom: 20px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
`;

const ModalButton = styled.button`
  padding: 12px 24px;
  margin: 0 12px;
  background: ${props => props.cancel ? '#f56565' : props.reject ? '#f56565' : props.mute ? '#ecc94b' : props.screen ? '#9f7aea' : props.camera ? '#ed8936' : props.fullscreen ? '#38b2ac' : '#4299e1'};
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
  &:hover {
    background: ${props => props.cancel ? '#c53030' : props.reject ? '#c53030' : props.mute ? '#d69e2e' : props.screen ? '#805ad5' : props.camera ? '#dd6b20' : props.fullscreen ? '#2c7a7b' : '#2b6cb0'};
    transform: translateY(-1px);
  }
`;

const AudioCallContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #2d3748;
  border-radius: 12px;
  padding: 20px;
  z-index: 2000;
  width: 450px;
  max-width: 95%;
  color: white;
`;

const VideoCallContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #000;
  border-radius: 12px;
  padding: 15px;
  z-index: 2000;
  width: ${props => props.isFullscreen ? '100vw' : '720px'};
  max-width: 95%;
  display: flex;
  flex-direction: ${props => props.isFullscreen ? 'row' : 'column'};
  gap: 15px;
`;

const Video = styled.video`
  width: ${props => props.isFullscreen ? '50%' : '340px'};
  height: ${props => props.isFullscreen ? 'calc(100vh - 80px)' : '240px'};
  border-radius: 8px;
  background: #1a202c;
  border: 2px solid #1e3b70;
`;

const CallStatus = styled.div`
  color: white;
  text-align: center;
  font-size: 1.1rem;
  padding: 10px;
  font-weight: 500;
`;

const CallControls = styled.div`
  display: flex;
  justify-content: center;
  gap: 15px;
  padding: 15px;
  flex-wrap: wrap;
`;

const LoadingIndicator = styled.div`
  text-align: center;
  padding: 50px;
  color: #2d3748;
  font-size: 1.2rem;
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 25px;
  color: #f56565;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  margin: 20px;
`;

const LoginButton = styled.button`
  padding: 12px 24px;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 15px;
  transition: all 0.2s ease;
  &:hover {
    background: #2b6cb0;
    transform: translateY(-1px);
  }
`;

const TemporaryMessage = styled.div`
  text-align: center;
  padding: 12px;
  color: #f56565;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  margin: 15px;
  font-size: 0.95rem;
`;

const CreateGroupButton = styled.button`
  padding: 12px 20px;
  margin: 15px;
  background: #48bb78;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
  display: block;
  width: calc(100% - 30px);
  &:hover {
    background: #38a169;
    transform: translateY(-1px);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px;
  margin-bottom: 20px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  background: #f7fafc;
  color: #2d3748;
  &:focus {
    outline: none;
    border-color: #f6e05e;
  }
`;

const MemberList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 20px;
   color: #2d3748;
`;

const MemberItem = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 0;
  gap: 10px;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const DiscussionsContent = ({ formateurId: propFormateurId, formateurName: propFormateurName }) => {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [temporaryMessage, setTemporaryMessage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [callStatus, setCallStatus] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiError, setEmojiError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState(propFormateurId);
  const [userName, setUserName] = useState(propFormateurName);
  const [userRole, setUserRole] = useState('');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedFormation, setSelectedFormation] = useState('');
  const [formations, setFormations] = useState([]);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(null);
  const [showManageMembersModal, setShowManageMembersModal] = useState(null);
  const [groupMembers, setGroupMembers] = useState({});
  const [potentialMembers, setPotentialMembers] = useState([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const agoraClientRef = useRef(null);
  const localTracksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const callListenerRef = useRef(null);

  // AgoraRTC Configuration
  const APP_ID = '8957a0acbcc3481fb34c329e6dff4a77';
  const TOKEN = null;
  const CHANNEL = 'chat_channel';

  const getChatId = (id1, id2) => [id1, id2].sort().join('_');

  const getInitiatorName = async (initiatorId) => {
    const userRef = ref(db, `utilisateurs/formateurs/${initiatorId}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return `${data.prenom} ${data.nom}`;
    }
    const adminRef = ref(db, `utilisateurs/admin`);
    const adminSnapshot = await get(adminRef);
    if (adminSnapshot.exists()) {
      const data = adminSnapshot.val();
      return `${data.prenom} ${data.nom}`;
    }
    return initiatorId;
  };

  const initializeAgora = async () => {
    try {
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      agoraClientRef.current = client;

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'video' || mediaType === 'audio') {
          setRemoteStream(user);
          if (remoteVideoRef.current && user.videoTrack) {
            remoteVideoRef.current.srcObject = new MediaStream([user.videoTrack.getMediaStreamTrack()]);
          }
        }
      });

      client.on('user-unpublished', () => {
        setRemoteStream(null);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
      });

      client.on('user-left', () => {
        endCall();
      });
    } catch (err) {
      setError(`Erreur d'initialisation Agora : ${err.message}`);
    }
  };

  const toggleMicrophone = async () => {
    try {
      const audioTrack = localTracksRef.current.find(track => track.trackMediaType === 'audio');
      if (!audioTrack) {
        setError('Piste audio non trouvée.');
        return;
      }
      await audioTrack.setEnabled(!isMicMuted);
      setIsMicMuted(!isMicMuted);
    } catch (err) {
      setError(`Erreur lors du basculement du microphone : ${err.message}`);
    }
  };

  const toggleCamera = async () => {
    try {
      const videoTrack = localTracksRef.current.find(track => track.trackMediaType === 'video');
      if (videoTrack) {
        await videoTrack.setEnabled(!isCameraOn);
        setIsCameraOn(!isCameraOn);
      }
    } catch (err) {
      setError(`Erreur lors du basculement de la caméra : ${err.message}`);
    }
  };

  const toggleScreenShare = async () => {
    try {
      const client = agoraClientRef.current;
      if (!client) {
        setError('Client Agora non initialisé.');
        return;
      }
      if (isSharingScreen) {
        const screenTrack = localTracksRef.current.find(track => track.trackMediaType === 'video');
        if (screenTrack) {
          await client.unpublish(screenTrack);
          screenTrack.close();
          localTracksRef.current = localTracksRef.current.filter(track => track !== screenTrack);
        }
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        await client.publish(videoTrack);
        localTracksRef.current.push(videoTrack);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = new MediaStream([videoTrack.getMediaStreamTrack()]);
        }
        setIsSharingScreen(false);
        setIsCameraOn(true);
      } else {
        const videoTrack = localTracksRef.current.find(track => track.trackMediaType === 'video');
        if (videoTrack) {
          await client.unpublish(videoTrack);
          videoTrack.close();
          localTracksRef.current = localTracksRef.current.filter(track => track !== videoTrack);
        }
        const screenTrack = await AgoraRTC.createScreenVideoTrack();
        await client.publish(screenTrack);
        localTracksRef.current.push(screenTrack);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = new MediaStream([screenTrack.getMediaStreamTrack()]);
        }
        setIsSharingScreen(true);
        setIsCameraOn(false);
      }
    } catch (err) {
      setError(`Erreur lors du basculement du partage d'écran : ${err.message}`);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const startCall = async (type) => {
    if (!selectedChat || selectedChat.type === 'group') {
      setError('Sélectionnez un contact pour appeler.');
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMicrophone = devices.some(device => device.kind === 'audioinput');
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      if (!hasMicrophone) {
        setError('Aucun microphone détecté.');
        return;
      }
      const constraints = {
        audio: true,
        video: type === 'video' && hasCamera
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints).catch(err => {
        throw new Error(`Erreur d'accès aux médias : ${err.message}`);
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      if (!agoraClientRef.current) {
        await initializeAgora();
      }
      const client = agoraClientRef.current;
      const uid = await client.join(APP_ID, CHANNEL, TOKEN, null);
      const localTracks = [];
      if (constraints.audio) {
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localTracks.push(audioTrack);
      }
      if (constraints.video) {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localTracks.push(videoTrack);
      }
      await client.publish(localTracks);
      localTracksRef.current = localTracks;
      const callId = push(ref(db, 'calls')).key;
      const callRef = ref(db, `calls/${callId}`);
      const recipientName = `${selectedChat.prenom} ${selectedChat.nom}`;
      await set(callRef, {
        initiator: userId,
        initiatorName: userName,
        recipient: selectedChat.id,
        recipientName,
        type,
        status: 'pending',
        channel: CHANNEL,
        uid,
        createdAt: serverTimestamp()
      });
      setCallStatus({ callId, type, role: 'initiator', status: 'Appel en cours...', initiatorName: userName, recipientName });
      const unsubscribe = onValue(callRef, snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.status === 'accepted') {
            setCallStatus(prev => ({ ...prev, status: 'Connecté' }));
          } else if (data.status === 'rejected' || data.status === 'ended') {
            endCall();
            if (callListenerRef.current) {
              callListenerRef.current();
              callListenerRef.current = null;
            }
          }
        } else {
          endCall();
          if (callListenerRef.current) {
            callListenerRef.current();
            callListenerRef.current = null;
          }
        }
      });
      callListenerRef.current = unsubscribe;
    } catch (err) {
      setError(`Erreur lors du démarrage de l'appel : ${err.message}`);
      endCall();
    }
  };

  const handleIncomingCall = async (callId, callData) => {
    const initiatorName = callData.initiatorName || await getInitiatorName(callData.initiator);
    setIncomingCall({ callId, ...callData, initiatorName });
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMicrophone = devices.some(device => device.kind === 'audioinput');
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      if (!hasMicrophone) {
        setError('Aucun microphone détecté.');
        return;
      }
      const constraints = {
        audio: true,
        video: incomingCall.type === 'video' && hasCamera
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints).catch(err => {
        throw new Error(`Erreur d'accès aux médias : ${err.message}`);
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      if (!agoraClientRef.current) {
        await initializeAgora();
      }
      const client = agoraClientRef.current;
      const uid = await client.join(APP_ID, incomingCall.channel, TOKEN, null);
      const localTracks = [];
      if (constraints.audio) {
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localTracks.push(audioTrack);
      }
      if (constraints.video) {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localTracks.push(videoTrack);
      }
      await client.publish(localTracks);
      localTracksRef.current = localTracks;
      const callRef = ref(db, `calls/${incomingCall.callId}`);
      await set(callRef, {
        ...incomingCall,
        status: 'accepted',
        recipientUid: uid
      });
      setCallStatus({ callId: incomingCall.callId, type: incomingCall.type, role: 'recipient', status: 'Connecté', initiatorName: incomingCall.initiatorName, recipientName: userName });
      const unsubscribe = onValue(callRef, snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.status === 'ended') {
            endCall();
          }
        } else {
          endCall();
        }
      });
      callListenerRef.current = unsubscribe;
      setIncomingCall(null);
    } catch (err) {
      setError(`Erreur lors de l'acceptation de l'appel : ${err.message}`);
      endCall();
    }
  };

  const rejectCall = async () => {
    if (!incomingCall) return;
    await set(ref(db, `calls/${incomingCall.callId}`), {
      ...incomingCall,
      status: 'rejected',
      endedAt: serverTimestamp()
    });
    setIncomingCall(null);
  };

  const endCall = async () => {
    try {
      if (agoraClientRef.current) {
        const client = agoraClientRef.current;
        localTracksRef.current.forEach(track => track.close());
        await client.unpublish(localTracksRef.current);
        await client.leave();
        agoraClientRef.current = null;
        localTracksRef.current = [];
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      setRemoteStream(null);
      if (callStatus?.callId) {
        await set(ref(db, `calls/${callStatus.callId}`), {
          ...callStatus,
          status: 'ended',
          endedAt: serverTimestamp()
        });
      }
      setCallStatus(null);
      setIncomingCall(null);
      setIsMicMuted(false);
      setIsCameraOn(true);
      setIsSharingScreen(false);
      setIsFullscreen(false);
      if (callListenerRef.current) {
        callListenerRef.current();
        callListenerRef.current = null;
      }
    } catch (err) {
      setError(`Erreur lors de la fin de l'appel : ${err.message}`);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || !selectedFormation) {
      setTemporaryMessage('Veuillez entrer un nom de groupe et sélectionner une formation.');
      setTimeout(() => setTemporaryMessage(null), 3000);
      return;
    }

    try {
      const groupsRef = ref(db, 'groups');
      const newGroupRef = push(groupsRef);
      
      // Fetch students for the selected formation
      const studentsToInclude = new Set();
      const inscriptionsRef = ref(db, 'inscriptions');
      const inscriptionsSnapshot = await get(inscriptionsRef);
      if (inscriptionsSnapshot.exists()) {
        inscriptionsSnapshot.forEach(student => {
          const studentId = student.key;
          student.forEach(inscription => {
            const data = inscription.val();
            if (data.formationId.toLowerCase() === selectedFormation.toLowerCase() && data.statut === 'validé') {
              studentsToInclude.add(studentId);
            }
          });
        });
      }

      // Create members object including the formateur
      const members = { [userId]: true };
      studentsToInclude.forEach(studentId => {
        members[studentId] = true;
      });

      await set(newGroupRef, {
        name: newGroupName,
        courseId: selectedFormation,
        members,
        createdAt: serverTimestamp()
      });

      setGroups(prev => [...prev, {
        id: newGroupRef.key,
        name: newGroupName,
        type: 'group',
        courseId: selectedFormation
      }]);

      setNewGroupName('');
      setSelectedFormation('');
      setShowCreateGroupModal(false);
      setTemporaryMessage('Groupe créé avec succès !');
      setTimeout(() => setTemporaryMessage(null), 3000);
    } catch (err) {
      setTemporaryMessage(`Erreur lors de la création du groupe : ${err.message}`);
      setTimeout(() => setTemporaryMessage(null), 3000);
    }
  };

  const deleteGroup = async (groupId) => {
    try {
      const groupRef = ref(db, `groups/${groupId}`);
      await remove(groupRef);
      setGroups(prev => prev.filter(group => group.id !== groupId));
      if (selectedChat?.id === groupId) {
        setSelectedChat(contacts.length > 0 ? contacts[0] : null);
      }
      setShowDeleteGroupModal(null);
      setTemporaryMessage('Groupe supprimé avec succès !');
      setTimeout(() => setTemporaryMessage(null), 3000);
    } catch (err) {
      setTemporaryMessage(`Erreur lors de la suppression du groupe : ${err.message}`);
      setTimeout(() => setTemporaryMessage(null), 3000);
    }
  };

  const openManageMembersModal = async (group) => {
    try {
      // Fetch current group members
      const groupRef = ref(db, `groups/${group.id}`);
      const groupSnapshot = await get(groupRef);
      if (groupSnapshot.exists()) {
        const groupData = groupSnapshot.val();
        setGroupMembers(groupData.members || {});
      }

      // Fetch potential members (students and formateurs related to the course)
      const potential = [];
      const inscriptionsRef = ref(db, 'inscriptions');
      const inscriptionsSnapshot = await get(inscriptionsRef);
      const studentIds = new Set();
      if (inscriptionsSnapshot.exists()) {
        inscriptionsSnapshot.forEach(student => {
          const studentId = student.key;
          student.forEach(inscription => {
            const data = inscription.val();
            if (data.formationId.toLowerCase() === group.courseId.toLowerCase() && data.statut === 'validé') {
              studentIds.add(studentId);
            }
          });
        });
      }

      const studentsRef = ref(db, 'utilisateurs/etudiants');
      const studentsSnapshot = await get(studentsRef);
      if (studentsSnapshot.exists()) {
        studentsSnapshot.forEach(student => {
          const studentData = student.val();
          if (studentIds.has(studentData.uid)) {
            potential.push({
              id: studentData.uid,
              name: `${studentData.prenom} ${studentData.nom}`,
              type: 'étudiant'
            });
          }
        });
      }

      const formateursRef = ref(db, 'utilisateurs/formateurs');
      const formateursSnapshot = await get(formateursRef);
      if (formateursSnapshot.exists()) {
        formateursSnapshot.forEach(formateur => {
          const formateurData = formateur.val();
          potential.push({
            id: formateurData.uid,
            name: `${formateurData.prenom} ${formateurData.nom}`,
            type: 'formateur'
          });
        });
      }

      setPotentialMembers(potential);
      setShowManageMembersModal(group);
    } catch (err) {
      setTemporaryMessage(`Erreur lors du chargement des membres : ${err.message}`);
      setTimeout(() => setTemporaryMessage(null), 3000);
    }
  };

  const updateGroupMembers = async () => {
    try {
      const groupRef = ref(db, `groups/${showManageMembersModal.id}`);
      await set(groupRef, {
        ...showManageMembersModal,
        members: groupMembers,
        updatedAt: serverTimestamp()
      });
      setShowManageMembersModal(null);
      setGroupMembers({});
      setPotentialMembers([]);
      setTemporaryMessage('Membres du groupe mis à jour avec succès !');
      setTimeout(() => setTemporaryMessage(null), 3000);
    } catch (err) {
      setTemporaryMessage(`Erreur lors de la mise à jour des membres : ${err.message}`);
      setTimeout(() => setTemporaryMessage(null), 3000);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        setUserId(user.uid);
        try {
          const formateurRef = ref(db, `utilisateurs/formateurs/${user.uid}`);
          const formateurSnapshot = await get(formateurRef);
          if (formateurSnapshot.exists()) {
            const formateurData = formateurSnapshot.val();
            setUserName(`${formateurData.prenom} ${formateurData.nom}`);
            setUserRole('formateur');
          } else {
            const etudiantRef = ref(db, `utilisateurs/etudiants/${user.uid}`);
            const etudiantSnapshot = await get(etudiantRef);
            if (etudiantSnapshot.exists()) {
              const etudiantData = etudiantSnapshot.val();
              setUserName(`${etudiantData.prenom} ${etudiantData.nom}`);
              setUserRole('étudiant');
            } else {
              setError('Utilisateur non trouvé.');
            }
          }
          setAuthChecked(true);
        } catch (err) {
          setError(`Erreur lors de la vérification de l'utilisateur : ${err.message}`);
          setAuthChecked(true);
          setLoading(false);
        }
      } else {
        try {
          const formateurRef = ref(db, `utilisateurs/formateurs/${propFormateurId}`);
          const snapshot = await get(formateurRef);
          if (snapshot.exists()) {
            const formateurData = snapshot.val();
            setUserId(propFormateurId);
            setUserName(`${formateurData.prenom} ${formateurData.nom}`);
            setUserRole('formateur');
            setAuthChecked(true);
          } else {
            setError('Utilisateur non trouvé. Veuillez vous connecter.');
            setAuthChecked(true);
            setLoading(false);
          }
        } catch (err) {
          setError(`Erreur lors de la vérification du formateur : ${err.message}`);
          setAuthChecked(true);
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, [propFormateurId, propFormateurName]);

  useEffect(() => {
    if (!userId || !authChecked) return;

    const callsRef = ref(db, 'calls');
    const incomingQuery = query(callsRef, orderByChild('recipient'), equalTo(userId));

    const unsubscribe = onValue(incomingQuery, snapshot => {
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          const callData = child.val();
          if (callData.status === 'pending' && !callStatus && !incomingCall) {
            handleIncomingCall(child.key, callData);
          }
        });
      }
    });

    return () => unsubscribe();
  }, [userId, callStatus, incomingCall, authChecked]);

  useEffect(() => {
    const fetchContactsAndGroups = async () => {
      setLoading(true);
      try {
        const contactsList = [];
        const studentIds = new Set();
        const groupsList = [];
        const formationsList = [];

        // Fetch admin
        const adminRef = ref(db, 'utilisateurs/admin');
        const adminSnapshot = await get(adminRef);
        if (adminSnapshot.exists()) {
          const adminData = adminSnapshot.val();
          contactsList.push({
            id: adminData.id || 'admin_default_id',
            nom: adminData.nom || 'Inconnu',
            prenom: adminData.prenom || '',
            type: 'admin',
            online: false
          });
        }

        // Fetch formations (for formateurs only)
        if (userRole === 'formateur') {
          const formationIds = new Set();
          // Check categories node
          const categoriesRef = ref(db, 'categories');
          const categoriesSnapshot = await get(categoriesRef);
          if (categoriesSnapshot.exists()) {
            categoriesSnapshot.forEach(category => {
              const categoryData = category.val();
              if (categoryData.formations) {
                Object.entries(categoryData.formations).forEach(([formationId, formation]) => {
                  if (formation.formateurId === userId) {
                    formationIds.add(formationId);
                    formationsList.push({
                      id: formationId,
                      name: formation.intitule || formation.titre || formation.specialite || 'Formation sans titre'
                    });
                  }
                });
              }
            });
          }

          // Check formations node
          const formationsRef = ref(db, 'formations');
          const formationsSnapshot = await get(formationsRef);
          if (formationsSnapshot.exists()) {
            formationsSnapshot.forEach(formation => {
              const formationData = formation.val();
              if (formationData.formateurId === userId) {
                formationIds.add(formation.key);
                formationsList.push({
                  id: formation.key,
                  name: formationData.intitule || formationData.titre || formationData.specialite || 'Formation sans titre'
                });
              }
            });
          }

          setFormations(formationsList);
        }

        // Fetch student's enrolled formations or formateur's formations
        const enrolledFormationIds = new Set();
        if (userRole === 'étudiant') {
          const inscriptionsRef = ref(db, `inscriptions/${userId}`);
          const inscriptionsSnapshot = await get(inscriptionsRef);
          if (inscriptionsSnapshot.exists()) {
            inscriptionsSnapshot.forEach(inscription => {
              const inscriptionData = inscription.val();
              if (inscriptionData.statut === 'validé' && inscriptionData.formationId) {
                enrolledFormationIds.add(inscriptionData.formationId.toLowerCase());
              }
            });
          }
        } else if (userRole === 'formateur') {
          formationsList.forEach(formation => {
            enrolledFormationIds.add(formation.id.toLowerCase());
          });
        }

        // Fetch formateurs associated with enrolled formations
        const formateursToInclude = new Set();
        const categoriesRef = ref(db, 'categories');
        const categoriesSnapshot = await get(categoriesRef);
        if (categoriesSnapshot.exists()) {
          categoriesSnapshot.forEach(category => {
            const categoryData = category.val();
            if (categoryData.formations) {
              Object.values(categoryData.formations).forEach((formation) => {
                if (enrolledFormationIds.has(formation.id.toLowerCase()) && formation.formateurId) {
                  formateursToInclude.add(formation.formateurId);
                }
              });
            }
          });
        }

        const formationsRef = ref(db, 'formations');
        const formationsSnapshot = await get(formationsRef);
        if (formationsSnapshot.exists()) {
          formationsSnapshot.forEach(formation => {
            const formationData = formation.val();
            if (enrolledFormationIds.has(formation.key.toLowerCase()) && formationData.formateurId) {
              formateursToInclude.add(formationData.formateurId);
            }
          });
        }

        // Fetch formateurs
        const formateursRef = ref(db, 'utilisateurs/formateurs');
        const formateursSnapshot = await get(formateursRef);
        if (formateursSnapshot.exists()) {
          formateursSnapshot.forEach(formateur => {
            const formateurData = formateur.val();
            if (formateursToInclude.has(formateurData.uid) && !studentIds.has(formateurData.uid)) {
              contactsList.push({
                id: formateurData.uid,
                nom: formateurData.nom,
                prenom: formateurData.prenom,
                type: 'formateur',
                online: false
              });
              studentIds.add(formateurData.uid);
            }
          });
        }

        // Fetch students enrolled in the same formations
        const allInscriptionsRef = ref(db, 'inscriptions');
        const allInscriptionsSnapshot = await get(allInscriptionsRef);
        const studentsToInclude = new Set();
        if (allInscriptionsSnapshot.exists()) {
          allInscriptionsSnapshot.forEach(studentInscriptions => {
            const studentId = studentInscriptions.key;
            studentInscriptions.forEach(inscription => {
              const inscriptionData = inscription.val();
              if (
                inscriptionData.statut === 'validé' &&
                enrolledFormationIds.has(inscriptionData.formationId.toLowerCase()) &&
                studentId !== userId
              ) {
                studentsToInclude.add(studentId);
              }
            });
          });
        }

        // Fetch students
        const studentsRef = ref(db, 'utilisateurs/etudiants');
        const studentsSnapshot = await get(studentsRef);
        if (studentsSnapshot.exists()) {
          studentsSnapshot.forEach(student => {
            const studentData = student.val();
            if (studentsToInclude.has(studentData.uid) && !studentIds.has(studentData.uid)) {
              contactsList.push({
                id: studentData.uid,
                nom: studentData.nom,
                prenom: studentData.prenom,
                type: 'étudiant',
                online: false
              });
              studentIds.add(studentData.uid);
            }
          });
        }

        // Fetch groups
        const groupsRef = ref(db, 'groups');
        const groupsSnapshot = await get(groupsRef);
        if (groupsSnapshot.exists()) {
          groupsSnapshot.forEach(group => {
            const groupData = group.val();
            if (
              groupData.courseId &&
              enrolledFormationIds.has(groupData.courseId.toLowerCase()) &&
              groupData.members &&
              groupData.members[userId] &&
              groupData.name
            ) {
              groupsList.push({
                id: group.key,
                name: groupData.name,
                type: 'group',
                courseId: groupData.courseId
              });
            }
          });
        }

        setContacts(contactsList);
        setGroups(groupsList);
        if (contactsList.length > 0 && !selectedChat) {
          setSelectedChat(contactsList[0]);
        }
        setLoading(false);
      } catch (err) {
        setError(`Erreur lors du chargement des contacts/groupes : ${err.message}`);
        setLoading(false);
      }
    };

    if (userId && authChecked && userRole) {
      fetchContactsAndGroups();
    } else if (authChecked) {
      setError('Identifiant utilisateur ou rôle manquant. Veuillez vous reconnecter.');
      setLoading(false);
    }
  }, [userId, authChecked, userRole]);

  useEffect(() => {
    if (!selectedChat || !userId) return;

    const unsubscribeList = [];

    const fetchMessages = (path) => {
      const messagesRef = ref(db, path);
      const unsubscribe = onValue(messagesRef, snapshot => {
        if (snapshot.exists()) {
          const messagesData = snapshot.val();
          const messagesList = Object.entries(messagesData).map(([id, data]) => ({
            id,
            ...data
          }));
          setMessages(prev => {
            const combined = [...prev, ...messagesList].reduce((acc, msg) => {
              acc[msg.id] = msg;
              return acc;
            }, {});
            return Object.values(combined).sort((a, b) => a?.timestamp - b?.timestamp);
          });
        } else {
          setMessages([]);
        }
      });
      unsubscribeList.push(unsubscribe);
      return unsubscribe;
    };

    if (selectedChat.type === 'group') {
      fetchMessages(`messages/groups/${selectedChat.id}`);
    } else {
      const standardChatId = getChatId(userId, selectedChat.id);
      fetchMessages(`messages/${standardChatId}`);
      if (selectedChat.type === 'admin') {
        const legacyChatId = `admin_${userId}`;
        fetchMessages(`messages/${legacyChatId}`);
      }
    }

    return () => unsubscribeList.forEach(unsubscribe => unsubscribe());
  }, [selectedChat, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    const chatId = selectedChat.type === 'group'
      ? `groups/${selectedChat.id}`
      : getChatId(userId, selectedChat.id);
    const messagesRef = ref(db, `messages/${chatId}`);
    const newMessageRef = push(messagesRef);

    try {
      await set(newMessageRef, {
        sender: userId,
        text: newMessage,
        timestamp: Date.now()
      });
      setNewMessage('');
      setShowEmojiPicker(false);
    } catch (err) {
      setTemporaryMessage(`Erreur lors de l'envoi du message : ${err.message}`);
      setTimeout(() => setTemporaryMessage(null), 3000);
    }
  };

  const handleEditMessage = (messageData) => {
    setEditingMessageId(messageData.id);
    setEditText(messageData.text);
  };

  const handleSaveEdit = async (messageId) => {
    if (!editText.trim()) return;

    const chatId = selectedChat.type === 'group'
      ? `groups/${selectedChat.id}`
      : getChatId(userId, selectedChat.id);
    const messageRef = ref(db, `messages/${chatId}/${messageId}`);

    try {
      await set(messageRef, {
        sender: userId,
        text: editText,
        timestamp: Date.now()
      });
      setEditingMessageId(null);
      setEditText('');
    } catch (err) {
      setTemporaryMessage(`Erreur lors de la modification du message : ${err.message}`);
      setTimeout(() => setTemporaryMessage(null), 3000);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!selectedChat) {
      setTemporaryMessage('Veuillez sélectionner un contact ou un groupe.');
      setTimeout(() => setTemporaryMessage(null), 3000);
      return;
    }

    const chatId = selectedChat.type === 'group'
      ? `groups/${selectedChat.id}`
      : getChatId(userId, selectedChat.id);
    const messagesRef = ref(db, `messages/${chatId}/${messageId}`);

    try {
      const snapshot = await get(messagesRef);
      if (snapshot.exists()) {
        await remove(messagesRef);
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      } else {
        setTemporaryMessage('Message non trouvé.');
        setTimeout(() => setTemporaryMessage(null), 3000);
      }
    } catch (err) {
      setTemporaryMessage(`Erreur lors de la suppression du message : ${err.message}`);
      setTimeout(() => setTemporaryMessage(null), 3000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && newMessage.trim()) {
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emojiObject) => {
    try {
      setNewMessage(prev => prev + emojiObject.emoji);
      setShowEmojiPicker(false);
    } catch (err) {
      setEmojiError(`Erreur lors de la sélection de l'emoji : ${err.message}`);
      setTimeout(() => setEmojiError(null), 3000);
    }
  };

  const handleLoginRedirect = () => {
    window.location.href = '/login';
  };

  if (!authChecked) {
    return <LoadingIndicator>Chargement de l'authentification...</LoadingIndicator>;
  }

  if (error) {
    return (
      <ErrorMessage>
        {error}
        <LoginButton onClick={handleLoginRedirect}>
          Se connecter
        </LoginButton>
      </ErrorMessage>
    );
  }

  if (loading) {
    return <LoadingIndicator>Chargement des discussions...</LoadingIndicator>;
  }

  return (
    <>
      {editingMessageId !== null && (
        <Modal>
          <ModalContent>
            <ModalHeader>Modifier le message</ModalHeader>
            <ModalInput
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSaveEdit(editingMessageId)}
            />
            <div>
              <ModalButton onClick={() => handleSaveEdit(editingMessageId)}>Sauvegarder</ModalButton>
              <ModalButton cancel onClick={() => setEditingMessageId(null)}>Annuler</ModalButton>
            </div>
          </ModalContent>
        </Modal>
      )}
      {showCreateGroupModal && (
        <Modal>
          <ModalContent>
            <ModalHeader>Créer un nouveau groupe</ModalHeader>
            <ModalInput
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="Nom du groupe"
            />
            <Select
              value={selectedFormation}
              onChange={e => setSelectedFormation(e.target.value)}
            >
              <option value="">Sélectionner une formation</option>
              {formations.map(formation => (
                <option key={formation.id} value={formation.id}>
                  {formation.name}
                </option>
              ))}
            </Select>
            <div>
              <ModalButton onClick={createGroup}>Créer</ModalButton>
              <ModalButton cancel onClick={() => setShowCreateGroupModal(false)}>Annuler</ModalButton>
            </div>
          </ModalContent>
        </Modal>
      )}
      {showDeleteGroupModal && (
        <Modal>
          <ModalContent>
            <ModalHeader>Confirmer la suppression</ModalHeader>
            <p>Êtes-vous sûr de vouloir supprimer le groupe "{showDeleteGroupModal.name}"?</p>
            <div>
              <ModalButton onClick={() => deleteGroup(showDeleteGroupModal.id)}>Supprimer</ModalButton>
              <ModalButton cancel onClick={() => setShowDeleteGroupModal(null)}>Annuler</ModalButton>
            </div>
          </ModalContent>
        </Modal>
      )}
      {showManageMembersModal && (
        <Modal>
          <ModalContent>
            <ModalHeader>Gérer les membres du groupe "{showManageMembersModal.name}"</ModalHeader>
            <MemberList>
              {potentialMembers.map(member => (
                <MemberItem key={member.id}>
                  <Checkbox
                    type="checkbox"
                    checked={!!groupMembers[member.id]}
                    onChange={() => setGroupMembers(prev => ({
                      ...prev,
                      [member.id]: !prev[member.id]
                    }))}
                  />
                  <span>{member.name} ({member.type})</span>
                </MemberItem>
              ))}
            </MemberList>
            <div>
              <ModalButton onClick={updateGroupMembers}>Sauvegarder</ModalButton>
              <ModalButton cancel onClick={() => {
                setShowManageMembersModal(null);
                setGroupMembers({});
                setPotentialMembers([]);
              }}>
                Annuler
              </ModalButton>
            </div>
          </ModalContent>
        </Modal>
      )}
      {incomingCall && (
        <Modal>
          <ModalContent>
            <ModalHeader>Appel entrant</ModalHeader>
            <p>{incomingCall.type === 'video' ? 'Appel vidéo' : 'Appel vocal'} de {incomingCall.initiatorName}</p>
            <div>
              <ModalButton onClick={acceptCall}>Accepter</ModalButton>
              <ModalButton reject onClick={rejectCall}>Rejeter</ModalButton>
            </div>
          </ModalContent>
        </Modal>
      )}
      {callStatus && callStatus.type === 'voice' && (
        <AudioCallContainer>
          <CallStatus>
            {callStatus.status} avec {callStatus.role === 'initiator' ? callStatus.recipientName : callStatus.initiatorName}
          </CallStatus>
          <CallControls>
            <ModalButton mute onClick={toggleMicrophone}>
              <i className={isMicMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone'} />
            </ModalButton>
            <ModalButton cancel onClick={endCall}>
              <i className="fas fa-phone-slash" />
            </ModalButton>
          </CallControls>
        </AudioCallContainer>
      )}
     {callStatus && callStatus.type === 'video' && (
  <VideoCallContainer isFullscreen={isFullscreen}>
    <CallStatus>
      {callStatus.status} avec {callStatus.role === 'initiator' ? callStatus.recipientName : callStatus.initiatorName}
    </CallStatus>
    <div style={{ display: 'flex', gap: '15px', flex: 1, flexDirection: isFullscreen ? 'row' : 'column' }}>
      <Video ref={localVideoRef} autoPlay muted isFullscreen={isFullscreen} playsInline />
      <Video ref={remoteVideoRef} autoPlay isFullscreen={isFullscreen} playsInline />
    </div>
    <CallControls>
      <ModalButton mute onClick={toggleMicrophone}>
        <i className={isMicMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone'} />
      </ModalButton>
      <ModalButton camera onClick={toggleCamera}>
        <i className={isCameraOn ? 'fas fa-video' : 'fas fa-video-slash'} />
      </ModalButton>
      <ModalButton screen onClick={toggleScreenShare}>
        <i className={isSharingScreen ? 'fas fa-stop-circle' : 'fas fa-desktop'} />
      </ModalButton>
      <ModalButton fullscreen onClick={toggleFullscreen}>
        <i className={isFullscreen ? 'fas fa-compress' : 'fas fa-expand'} />
      </ModalButton>
      <ModalButton cancel onClick={endCall}>
        <i className="fas fa-phone-slash" />
      </ModalButton>
    </CallControls>
  </VideoCallContainer>
)}
<ChatContainer>
  <ChatSidebar>
    {userRole === 'formateur' && (
      <CreateGroupButton onClick={() => setShowCreateGroupModal(true)}>
        Créer un nouveau groupe
      </CreateGroupButton>
    )}
    {contacts.map(contact => (
      <ChatItem
        key={contact.id}
        selected={selectedChat?.id === contact.id}
        onClick={() => setSelectedChat(contact)}
      >
        <OnlineIndicator online={contact.online} />
        <ChatName>{contact.prenom} {contact.nom} ({contact.type})</ChatName>
      </ChatItem>
    ))}
    {groups.map(group => (
      <ChatItem
        key={group.id}
        selected={selectedChat?.id === group.id}
        onClick={() => setSelectedChat(group)}
      >
        <OnlineIndicator online={false} />
        <ChatName>{group.name} (Groupe)</ChatName>
        {userRole === 'formateur' && (
          <>
            <GroupActions
              title="Gérer les membres"
              onClick={(e) => {
                e.stopPropagation();
                openManageMembersModal(group);
              }}
            >
              <i className="fas fa-users" />
            </GroupActions>
            <GroupActions
              title="Supprimer le groupe"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteGroupModal(group);
              }}
            >
              <i className="fas fa-trash" />
            </GroupActions>
          </>
        )}
      </ChatItem>
    ))}
  </ChatSidebar>
  <ChatWindow>
    {selectedChat ? (
      <>
        <ChatHeader>
          {selectedChat.type === 'group'
            ? selectedChat.name
            : `${selectedChat.prenom} ${selectedChat.nom}`}
        </ChatHeader>
        {selectedChat.type !== 'group' && (
          <CallButtons>
            <CallButton
              onClick={() => startCall('voice')}
              disabled={callStatus || incomingCall}
            >
              Appel Vocal
            </CallButton>
            <CallButton
              video
              onClick={() => startCall('video')}
              disabled={callStatus || incomingCall}
            >
              Appel Vidéo
            </CallButton>
          </CallButtons>
        )}
        {temporaryMessage && <TemporaryMessage>{temporaryMessage}</TemporaryMessage>}
        <MessagesArea>
          {messages.map(messageData => (
            <Message key={messageData.id} isCurrentUser={messageData.sender === userId}>
              <MessageBubble isCurrentUser={messageData.sender === userId}>
                {messageData.text}
              </MessageBubble>
              {messageData.sender === userId && (
                <MessageActions className="message-actions">
                  <ActionButton onClick={() => handleEditMessage(messageData)}>Modifier</ActionButton>
                  <ActionButton onClick={() => handleDeleteMessage(messageData.id)}>Supprimer</ActionButton>
                </MessageActions>
              )}
            <MessageTime>
              {new Date(messageData.timestamp).toLocaleString('fr-FR')}
            </MessageTime>
          </Message>
        ))}
        <div ref={messagesEndRef} />
      </MessagesArea>
      <InputArea>
        <EmojiButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
          😊
        </EmojiButton>
        {showEmojiPicker && (
          <EmojiPickerContainer>
            {emojiError ? (
              <ErrorMessage>{emojiError}</ErrorMessage>
            ) : (
              <EmojiPicker onEmojiClick={handleEmojiSelect} />
            )}
          </EmojiPickerContainer>
        )}
        <MessageInput
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Tapez votre message..."
          disabled={callStatus}
        />
        <SendButton
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || callStatus}
        >
          Envoyer
        </SendButton>
      </InputArea>
    </>
  ) : (
    <MessagesArea>
      <div style={{ textAlign: 'center', padding: '30px', color: '#2d3748', fontSize: '1.2rem' }}>
        Sélectionnez un contact ou un groupe pour commencer la discussion.
      </div>
    </MessagesArea>
  )}
</ChatWindow>
</ChatContainer>
    </>
  );
};

export default DiscussionsContent;