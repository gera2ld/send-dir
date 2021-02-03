# send-dir

Send directory via direct HTTP between different machines.

## Why

This could be useful when sending built code to the development server frequently, especially when we don't have SSH. This tool just works if only we have HTTP.

## Usage

```bash
$ npx send-dir SOURCE_DIR TARGET_DIR
```

And then follow the instructions in output, like running a one-line command in the target machine.

Note that both `SOURCE_DIR` and `TARGET_DIR` can be relative paths, just that `SOURCE_DIR` is relative to the working directory of your source machine and `TARGET_DIR` is relative to that of your target machine.

## Example

Here is a more detailed example.

Say we are at the root of the project, and want to copy `./packages/awesome/lib` to `./node_modules/awesome/lib` in the development machine which does not support SSH server.

Then we just need to run:

```bash
$ npx send-dir packages/awesome/lib node_modules/awesome/lib
```

And we will see output like this:

```bash
Run the following command at your target machine:

  curl -fsS http://192.168.31.161:8001/fetch.sh | sh
```

We copy the one-line command and paste it in the development machine, or you may type it if the two machines are isolated physically (sad). Done!
