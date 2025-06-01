const admin = require('../firebase');
const { sha256 } = require('js-sha256');

class UserModel {
  constructor() {
    this.db = admin.database();
  }

  async getAllUsers() {
    try {
      console.log('Querying utilisateurs path');
      const snapshot = await this.db.ref('utilisateurs').once('value');
      if (!snapshot.exists()) {
        console.log('No data found at utilisateurs path');
        return [];
      }
      const users = snapshot.val() || {};
      console.log('Raw users data:', JSON.stringify(users, null, 2));
      const userList = [];

      if (users.admin && typeof users.admin === 'object') {
        userList.push({
          uid: users.admin.id || 'admin',
          ...users.admin,
          role: 'admin',
        });
      } else {
        console.log('No admin user found or invalid format');
      }

      if (users.formateurs && typeof users.formateurs === 'object') {
        Object.entries(users.formateurs).forEach(([uid, data]) => {
          if (data && typeof data === 'object') {
            userList.push({ uid, ...data, role: 'formateur' });
          } else {
            console.warn(`Invalid formateur data for UID ${uid}:`, data);
          }
        });
      } else {
        console.log('No formateurs found');
      }

      if (users.etudiants && typeof users.etudiants === 'object') {
        Object.entries(users.etudiants).forEach(([uid, data]) => {
          if (data && typeof data === 'object') {
            userList.push({ uid, ...data, role: 'etudiant' });
          } else {
            console.warn(`Invalid etudiant data for UID ${uid}:`, data);
          }
        });
      } else {
        console.log('No etudiants found');
      }

      console.log('Returning userList with', userList.length, 'users');
      return userList;
    } catch (error) {
      console.error('Error in getAllUsers:', {
        message: error.message,
        code: error.code || 'N/A',
        stack: error.stack,
      });
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  async getUserByEmail(email) {
    try {
      console.log('Searching user by email:', email);
      let user = await this.getAdminByEmail(email);
      if (user) return user;

      user = await this.getFormateurByEmail(email);
      if (user) return user;

      user = await this.getEtudiantByEmail(email);
      return user;
    } catch (error) {
      console.error('Error in getUserByEmail:', {
        message: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to fetch user by email: ${error.message}`);
    }
  }

  async getAdminByEmail(email) {
    try {
      const snapshot = await this.db.ref('utilisateurs/admin').once('value');
      const admin = snapshot.val();
      return admin && admin.email === email ? { ...admin, role: 'admin', uid: admin.id || 'admin' } : null;
    } catch (error) {
      console.error('Error in getAdminByEmail:', error.stack);
      throw error;
    }
  }

  async getFormateurByEmail(email) {
    try {
      const snapshot = await this.db
        .ref('utilisateurs/formateurs')
        .orderByChild('email')
        .equalTo(email)
        .once('value');
      if (snapshot.exists()) {
        const formateurs = snapshot.val();
        const uid = Object.keys(formateurs)[0];
        return { uid, ...formateurs[uid], role: 'formateur' };
      }
      return null;
    } catch (error) {
      console.error('Error in getFormateurByEmail:', error.stack);
      throw error;
    }
  }

  async getEtudiantByEmail(email) {
    try {
      const snapshot = await this.db
        .ref('utilisateurs/etudiants')
        .orderByChild('email')
        .equalTo(email)
        .once('value');
      if (snapshot.exists()) {
        const etudiants = snapshot.val();
        const uid = Object.keys(etudiants)[0];
        return { uid, ...etudiants[uid], role: 'etudiant' };
      }
      return null;
    } catch (error) {
      console.error('Error in getEtudiantByEmail:', error.stack);
      throw error;
    }
  }

  async createUser(userData, role) {
    try {
      const { email, nom, prenom, motDePasse, numTel, niveau, diplome, cin } = userData;
      if (!email || !nom || !prenom || !motDePasse) {
        throw new Error('Champs requis manquants: email, nom, prenom, motDePasse');
      }

      // Check email uniqueness
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }

      const hashedPassword = role === 'admin' ? motDePasse : sha256(motDePasse);
      const newUser = {
        email,
        nom,
        prenom,
        motDePasse: hashedPassword,
        status: 'active',
        resetPasswordNeeded: false,
        ...(numTel && { numTel }),
        ...(niveau && { niveau }),
        ...(diplome && { diplome }),
        ...(cin && { cin }),
      };

      console.log('Creating user:', { email, role });
      if (role === 'admin') {
        await this.db.ref('utilisateurs/admin').set({ ...newUser, id: 'admin' });
        return 'admin';
      } else {
        const newRef = this.db.ref(`utilisateurs/${role}s`).push();
        await newRef.set(newUser);
        return newRef.key;
      }
    } catch (error) {
      console.error('Error in createUser:', {
        message: error.message,
        stack: error.stack,
      });
      throw new Error(error.message);
    }
  }

  async updateUser(uid, role, updates) {
    try {
      const path = role === 'admin' ? 'utilisateurs/admin' : `utilisateurs/${role}s/${uid}`;
      if (updates.motDePasse) {
        updates.motDePasse = role === 'admin' ? updates.motDePasse : sha256(updates.motDePasse);
      }
      console.log('Updating user:', { uid, role, updates });
      await this.db.ref(path).update(updates);
    } catch (error) {
      console.error('Error in updateUser:', {
        message: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async deleteUser(uid, role) {
    try {
      const path = role === 'admin' ? 'utilisateurs/admin' : `utilisateurs/${role}s/${uid}`;
      console.log('Deleting user:', { uid, role });
      await this.db.ref(path).remove();
    } catch (error) {
      console.error('Error in deleteUser:', {
        message: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async toggleUserStatus(uid, role, currentStatus) {
    try {
      const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
      const path = role === 'admin' ? 'utilisateurs/admin' : `utilisateurs/${role}s/${uid}`;
      console.log('Toggling user status:', { uid, role, newStatus });
      await this.db.ref(path).update({ status: newStatus });
    } catch (error) {
      console.error('Error in toggleUserStatus:', {
        message: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to toggle user status: ${error.message}`);
    }
  }
}

module.exports = new UserModel();