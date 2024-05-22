import {prisma} from "../config";
import express, {Request, Response} from "express"
import Joi from "joi";
import {Prisma} from "../generated/prisma/client";

const router = express.Router();
import PostCreateArgs = Prisma.PostCreateArgs;

const threadSchema = Joi.object({
    likes: Joi.number().integer().equal(0),
    coinId: Joi.string().required(),
    authorId: Joi.string().required(),
    text: Joi.string().required(),
});

// Get All Threads
router.get('/post', async (req: Request, res: Response) => {
    const threads = await prisma.thread.findMany();
    res.json(threads);
});

// Get Single Thread
router.get('/post/:id', async (req: Request<{ id: number }>, res: Response) => {
    const thread = await prisma.thread.findFirst({where: {id: req.params.id}})
    res.json(thread);
});

// Create Thread

router.post('/post', async (req: Request<{}, any, PostCreateArgs>, res: Response) => {

    const validation = threadSchema.validate(req.body);
    if (validation.error) {
        return res.status(400).send(validation.error.details[0].message);
    }
    const newThread = await prisma.thread.create(req.body);
    res.json(newThread);
});

// Update Thread
// router.put('/post/:id', async (req: Request<{id: number}, any, PostUpdateArgs>, res) => {
//     //Request has signature
//     // YOu verify the signature
//     // You allow editing the thread ONLY if the signature comes from the person who wrote the comment
//
//     // const { message, signature } = req.body;
//     // const recoveredAddress = extractAddressFromMessage(message, signature);
//     // if (!recoveredAddress === message.account) {
//     //     logger.warn(`Received signature from address that doesn't match the signature.
//     // Got ${message.account} in the message but recovered ${recoveredAddress}`);
//     //     return res.status(401).send("Signature doesn't match the message");
//     // }
//     // next();
//     const updatedThread = await prisma.thread.update({where: {id: req.params.id}, data: req.body};
//     res.json(updatedThread);
// });

// Delete Thread
// router.delete('/thread/:id', async (req, res) => {
//     await Thread.deleteThread(req.params.id);
//     res.json({ message: 'Thread deleted' });
// });

module.exports = router;