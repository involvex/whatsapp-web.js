const { expect } = require('chai');
const sinon = require('sinon');

const helper = require('../helper');
const { Contact, Chat } = require('../../src/structures');
const { withErrorHandling, withCleanup, describeWithClient } = require('../utils/errorHandler');

const remoteId = helper.remoteId;

describe('Message', function () {
    let client;
    let chat;
    let message;

    before(async function () {
        this.timeout(25000);
        try {
            client = helper.createClient({ authenticated: true });
            this.client = client; // Store for error handling
            
            await client.initialize();
            
            chat = await client.getChatById(remoteId);
            
            // Send a test message and wait for it to be sent
            message = await chat.sendMessage('this is only a test');
            
            // Wait for message to be properly sent
            await helper.waitFor(
                async () => {
                    const info = await message.getInfo();
                    return info && info.delivery.length > 0;
                },
                { 
                    timeout: 5000,
                    timeoutMessage: 'Message was not delivered in time'
                }
            );
        } catch (err) {
            console.error('Setup failed:', err);
            // Capture screenshot if possible
            if (client && client.pupPage) {
                try {
                    const timestamp = new Date().toISOString().replace(/:/g, '-');
                    await client.pupPage.screenshot({ 
                        path: `./tests/screenshots/setup_error_${timestamp}.png`,
                        fullPage: true
                    });
                } catch (e) {
                    console.error('Failed to capture setup error screenshot:', e);
                }
            }
            throw err;
        }
    });

    after(async function () {
        if (client) {
            await client.destroy().catch(err => {
                console.error('Error during client cleanup:', err);
            });
        }
    });

    it('can get the related chat', withErrorHandling(async function () {
        const chat = await message.getChat();
        expect(chat).to.be.instanceOf(Chat);
        expect(chat.id._serialized).to.equal(remoteId);
    }));

    it('can get the related contact', withErrorHandling(async function () {
        const contact = await message.getContact();
        expect(contact).to.be.instanceOf(Contact);
        expect(contact.id._serialized).to.equal(client.info.wid._serialized);
    }));

    it('can get message info', withErrorHandling(async function () {
        const info = await message.getInfo();
        expect(typeof info).to.equal('object');
        expect(Array.isArray(info.played)).to.equal(true);
        expect(Array.isArray(info.read)).to.equal(true);
        expect(Array.isArray(info.delivery)).to.equal(true);
    }));

    describe('Replies', function () {
        let replyMsg;

        it('can reply to a message', withErrorHandling(async function () {
            replyMsg = await message.reply('this is my reply');
            
            // Wait for reply message to be properly sent
            await helper.waitFor(
                async () => {
                    try {
                        const info = await replyMsg.getInfo();
                        return info && info.delivery.length > 0;
                    } catch (err) {
                        return false;
                    }
                },
                { timeout: 5000 }
            );
            
            expect(replyMsg.hasQuotedMsg).to.equal(true);
        }));

        it('can get the quoted message', withErrorHandling(async function () {
            const quotedMsg = await replyMsg.getQuotedMessage();
            expect(quotedMsg.id._serialized).to.equal(message.id._serialized);
        }));
    });

    describe('Star', function () {
        it('can star a message', withErrorHandling(async function () {
            expect(message.isStarred).to.equal(false);
            await message.star();

            // Wait for star status to be updated
            await helper.waitFor(
                async () => {
                    await message.reload();
                    return message.isStarred === true;
                },
                { 
                    timeout: 5000,
                    timeoutMessage: 'Message star status was not updated in time'
                }
            );
            
            expect(message.isStarred).to.equal(true);
        }));

        it('can un-star a message', withErrorHandling(async function () {
            expect(message.isStarred).to.equal(true);
            await message.unstar();

            // Wait for star status to be updated
            await helper.waitFor(
                async () => {
                    await message.reload();
                    return message.isStarred === false;
                },
                { 
                    timeout: 5000,
                    timeoutMessage: 'Message star status was not updated in time'
                }
            );
            
            expect(message.isStarred).to.equal(false);
        }));
    });

    describe('Delete', function () {
        it('can delete a message for me', withErrorHandling(async function () {
            await message.delete();

            // Wait for message to be deleted
            await helper.waitFor(
                async () => {
                    const reloaded = await message.reload();
                    return reloaded === null;
                },
                { 
                    timeout: 5000,
                    timeoutMessage: 'Message was not deleted in time'
                }
            );
            
            expect(await message.reload()).to.equal(null);
        }));

        it('can delete a message for everyone', withErrorHandling(async function () {
            // Send a new test message
            message = await chat.sendMessage('sneaky message');
            
            // Wait for message to be properly sent
            await helper.waitFor(
                async () => {
                    try {
                        const info = await message.getInfo();
                        return info && info.delivery.length > 0;
                    } catch (err) {
                        return false;
                    }
                },
                { timeout: 5000 }
            );

            const callback = sinon.spy();
            client.once('message_revoke_everyone', callback);

            await message.delete(true);
            
            // Wait for message to be deleted and event to be emitted
            await helper.waitFor(
                async () => {
                    const reloaded = await message.reload();
                    return reloaded === null && callback.called;
                },
                { 
                    timeout: 5000,
                    timeoutMessage: 'Message was not deleted for everyone in time'
                }
            );

            expect(await message.reload()).to.equal(null);
            expect(callback.called).to.equal(true);
            const [revokeMsg, originalMsg] = callback.args[0];
            expect(revokeMsg.id._serialized).to.equal(
                originalMsg.id._serialized,
            );
            expect(originalMsg.body).to.equal('sneaky message');
            expect(originalMsg.type).to.equal('chat');
            expect(revokeMsg.body).to.equal('');
            expect(revokeMsg.type).to.equal('revoked');
        }));
    });
});
