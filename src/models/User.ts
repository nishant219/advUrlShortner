import mongoose from 'mongoose';
import { IUser } from '../types';

const userSchema = new mongoose.Schema<IUser>({
    email:{
        type: String,
        required: true,
        unique: true
    },
    googleId:{
        type: String,
        required: true,
        unique: true
    }
},{
    timestamps: true
});

export const User = mongoose.model<IUser>('User', userSchema);