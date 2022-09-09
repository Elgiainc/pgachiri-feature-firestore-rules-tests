const assert = require('assert');
const { initializeTestEnvironment, initializeAdminApp, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc } = require("firebase/firestore");
const fs = require('fs');

const projectId = "development-elgia-academy";
const myId = "test@elgia.com";
const theirId = "other@elgia.com";
const myEmail = "test@elgia.com"
const myAuth = {
    uid: myEmail,
    email: myEmail,
    custom: {
        token: {
            email: myEmail,
            sub: myEmail,
        }
    }
};

beforeEach(async() => {
    const mockEnv = await getTestEnv();
    // mockEnv.cleanup()
    await mockEnv.clearFirestore()
});

async function getTestEnv() {
    const testEnv = await initializeTestEnvironment({
        projectId: projectId,
        firestore: {
            rules: fs.readFileSync("../firestore.rules", "utf8"),
            host: "localhost",
            port: 8080
        },
    });
    return testEnv;
}

async function createTestUser() {
    const mockEnv = await getTestEnv();
    return await mockEnv.withSecurityRulesDisabled(async(context) => {
        const testdoc = context.firestore().collection('users').doc(myAuth.uid);
        await setDoc(testdoc, {
            id: myAuth.uid,
            email: myAuth.email,
            name: 'nameless',
            featurePermissions: {
                permissions: {
                    admin: {
                        read: false,
                        create: false,
                        update: true,
                        delete: true,
                    },
                    users: {
                        read: true,
                        create: true,
                        update: true,
                        delete: true,
                    }
                }
            }
        });
    });
}

const collections = ['users', 'groups', 'comments', 'courses'];

describe("Alinkeo Firestore Rules:", () => {
    it("understands basic arithmetic", () => {
        assert.equal(2 + 2, 4);
    });

    collections.map((collection) => {
        it(`UNauthenticated user CANNOT read a document in ${collection} collection`, async() => {
            const mockEnv = await getTestEnv();
            const context = mockEnv.unauthenticatedContext();
            return await assertFails(getDoc(doc(context.firestore(), collection, myAuth.uid)));
        });

        it(`authenticated user CAN read a document in ${collection} collection`, async() => {
            await createTestUser();
            const mockEnv = await getTestEnv();
            const context = mockEnv.authenticatedContext(myAuth.uid, myAuth.custom);
            return await assertSucceeds(getDoc(doc(context.firestore(), collection, myAuth.uid)));
        });

        it(`authenticated user CAN set a document in ${collection} collection`, async() => {
            await createTestUser();
            const mockEnv = await getTestEnv();
            const context = mockEnv.authenticatedContext(myAuth.uid, myAuth.custom);
            const testDoc = context.firestore().collection(collection).doc(myAuth.uid);

            return await assertSucceeds(setDoc(testDoc, { id: myAuth.uid, name: 'test name', email: myAuth.email, active: true, groups: [], courses: [], createdAt: '' }));
        });


        it(`UNauthenticated user CANNOT set a document in ${collection} collection`, async() => {
            const mockEnv = await getTestEnv();
            const context = mockEnv.unauthenticatedContext();
            const testDoc = context.firestore().collection(collection).doc(myAuth.uid);

            return await assertFails(setDoc(testDoc, { name: 'test name' }));
        });
    });

    // it("can a read or write to a document in users collection happen with firestore rules disabled", async() => {
    //     const mockEnv = await getTestEnv();
    //     return await mockEnv.withSecurityRulesDisabled(async(context) => {
    //         const testdoc = context.firestore().collection('users').doc(myAuth.uid);
    //         await setDoc(testdoc, { test: 'test name' });
    //     });
    // });
});

after(async() => {
    const mockEnv = await getTestEnv();
    // mockEnv.cleanup()
    await mockEnv.clearFirestore()
});