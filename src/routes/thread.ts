import {prisma} from "../config";
import express, {Request, Response} from "express"
import Joi from "joi";
import {verifyPersonalMessage} from '@mysten/sui.js/verify';

const router = express.Router();
type ThreadPostRequest = {
    coinId: string,
    text: string,
    signature: string,
    author: string,
}

const threadSchema = Joi.object({
    coinId: Joi.string().required(),
    text: Joi.string().required(),
    signature: Joi.string().required(),
    author: Joi.string().required(),
});

// Get All Threads
router.get('/post', async (req: Request, res: Response) => {
    const threads = await prisma.post.findMany();
    return res.json(threads);
});

// Get Single Thread
router.get('/post/:id', async (req: Request<{ id: number }>, res: Response) => {
    const thread = await prisma.post.findFirst({where: {id: req.params.id}})
    return res.json(thread);
});

router.post('/post', async (req: Request<{}, any, ThreadPostRequest>, res: Response) => {
        const validation = threadSchema.validate(req.body);
        if (validation.error) {
            return res.status(400).send(validation.error.details[0].message);
        }

        const {coinId, text, author, signature} = req.body;
        const message = new TextEncoder().encode(text);
        const publicKey = await verifyPersonalMessage(message, signature);

        if (publicKey.toSuiAddress() !== author) {
            return res.status(401).send("Signature doesn't match the message, blocking post creation");
        }


        const newThread = await prisma.post.create({
            data: {
                coinId,
                text,
                authorId: req.body.author || "",
            }
        });
        console.log("created thread", newThread);
        return res.json(newThread);
    }
);

// Update Thread
// router.put('/post/:id', async (req: Request<{id: number}, any, PostUpdateArgs>, res) => {
// TODO If you implement this, create a sig auth middleware
//     const { message, signature } = req.body;
//     const recoveredAddress = extractAddressFromMessage(message, signature);
//     if (!recoveredAddress === message.account) {
//         logger.warn(`Received signature from address that doesn't match the signature.
//     Got ${message.account} in the message but recovered ${recoveredAddress}`);
//         return res.status(401).send("Signature doesn't match the message");
//     }
//     next();
//     const updatedThread = await prisma.thread.update({where: {id: req.params.id}, data: req.body};
//     res.json(updatedThread);
// });

// Delete Thread
// router.delete('/thread/:id', async (req, res) => {
// TODO If you implement this, create a sig auth middleware
//     await Thread.deleteThread(req.params.id);
//     res.json({ message: 'Thread deleted' });
// });

export default router