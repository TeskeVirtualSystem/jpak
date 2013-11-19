/**********************************************
 *     _ ____   _    _  __        _   ___     *
 *    | |  _ \ / \  | |/ / __   _/ | / _ \    *
 * _  | | |_) / _ \ | ' /  \ \ / / || | | |   *
 *| |_| |  __/ ___ \| . \   \ V /| || |_| |   *
 * \___/|_| /_/   \_\_|\_\   \_/ |_(_)___/    *
 *                                            *
 *Multiuse Javascript Package                 *
 *By: Lucas Teske                             *
 *https://github.com/racerxdl/jpak            *
 **********************************************/
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace JPAK
{
    public static class Extensions
    {
        public static T[] SubArray<T>(this T[] data, int index, int length)
        {
            T[] result = new T[length];
            Array.Copy(data, index, result, 0, length);
            return result;
        }
    }
}
