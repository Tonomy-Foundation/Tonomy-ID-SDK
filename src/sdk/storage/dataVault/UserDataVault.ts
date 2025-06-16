import { DataSource } from 'typeorm';
import { IdentityVerificationStorage } from '../entities/identityVerificationStorage';
import { VerificationType } from '../entities/identityVerificationStorage';
import { VcStatus } from '../entities/identityVerificationStorage';
import { Communication, Subscriber } from '../../services/communication/communication';
import { DID } from '../../util/ssi/types';
import { IdentityVerificationStorageRepository } from '../identityVerificationStorageRepository';
import { Message } from '../../services/communication/message';
import { VerificationMessage, VerificationMessagePayload } from '../../services/communication/verificationMessage';

export class UserDataVault {
    private readonly repository: IdentityVerificationStorageRepository;
    private readonly communication: Communication;
    private readonly did: DID;

    constructor(dataSource: DataSource, communication: Communication, did: DID) {
        this.repository = new IdentityVerificationStorageRepository(dataSource);
        this.communication = communication;
        this.did = did;
    }

    /**
     * Starts verification process for a specific type
     * @param type The type of verification to start
     * @returns Promise that resolves with the created verification record
     */
    async startVerification(type: VerificationType): Promise<IdentityVerificationStorage> {
        // Create a new verification record
        const veriffId = this.did; // Using DID as veriffId for now
        const vc = await this.createVerificationVC(type);
        
        const verification = await this.repository.create(veriffId, vc, VcStatus.PENDING);
        
        // Send verification request through communication
        await this.sendVerificationRequest(verification);
        
        return verification;
    }

    /**
     * Subscribes to verification updates
     * @param callback Function to call when verification status changes
     * @returns Subscription ID that can be used to unsubscribe
     */
    subscribeToVerificationUpdates(callback: (verification: IdentityVerificationStorage) => void): number {
        const handler: Subscriber = async (message: Message): Promise<void> => {
            if (message.getType() === 'verification') {
                try {
                    const update = await this.parseVerificationUpdate(message as VerificationMessage);
                    
                    // Update the verification status in the database
                    await this.updateVerificationStatus(update);
                    
                    // Call the callback with the updated verification
                    callback(update);
                } catch (error) {
                    console.error('Error processing verification update:', error);
                }
            }
        };
        return this.communication.subscribeMessage(handler);
    }

    /**
     * Create a verification VC for a specific type
     * @param type The type of verification
     * @returns The verification VC as a string
     */
    private async createVerificationVC(type: VerificationType): Promise<string> {
        return JSON.stringify({
            type,
            did: this.did,
            status: 'pending',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Send verification request through communication
     * @param verification The verification record to send
     */
    private async sendVerificationRequest(verification: IdentityVerificationStorage): Promise<void> {
        if (!this.communication.isLoggedIn()) {
            throw new Error('Not authenticated with communication service');
        }
        
        const payload: VerificationMessagePayload = {
            veriffId: verification.veriffId,
            vc: verification.vc,
            type: verification.type
        };
        const issuer = this.communication.getIssuer();
        if (!issuer) {
            throw new Error('No issuer information available');
        }
        const message = await VerificationMessage.signMessage(payload, issuer, this.did);
        await this.communication.sendMessage(message);
    }

    /**
     * Parse a verification update message
     * @param message The verification update message
     * @returns The parsed verification update
     */
    private async parseVerificationUpdate(message: VerificationMessage): Promise<IdentityVerificationStorage> {
        const payload = message.getVc().getPayload();
        if (!payload?.vc) {
            throw new Error('Invalid verification update message');
        }

        // Find the existing verification record
        const existing = await this.repository.findByVeriffId(this.did);
        if (!existing) {
            throw new Error('Verification record not found');
        }

        // Update the status based on the VC
        const vc = JSON.parse(message.payload.vc);
        const status = vc.status === 'APPROVED' 
            ? VcStatus.APPROVED 
            : vc.status === 'REJECTED' 
                ? VcStatus.REJECTED 
                : VcStatus.PENDING;

        return {
            ...existing,
            status,
            updatedAt: new Date(),
            vc: message.payload.vc
        };
    }

    /**
     * Update verification status in the database
     * @param update The verification update to save
     */
    private async updateVerificationStatus(update: IdentityVerificationStorage): Promise<void> {
        await this.repository.update(update);
    }

    /**
     * Unsubscribes from verification updates
     * @param subscriptionId The ID returned from subscribeToVerificationUpdates
     */
    unsubscribeFromVerificationUpdates(subscriptionId: number): void {
        this.communication.unsubscribeMessage(subscriptionId);
    }
}
